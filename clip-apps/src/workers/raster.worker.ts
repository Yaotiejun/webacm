/// <reference lib="webworker" />

import type { RasterRequest, RasterResult, RasterPath } from '@/types/raster'
import type { RasterWorkerResultMessage } from '@/core/raster/rasterWorkerProtocol'
import {
  countTracingPoints,
  enforceTracingPointBudget,
  normalizeTracingPaths,
  sampleTracingPolyline,
} from '@/core/raster/tracingSampling'
import { computeRasterTracingCollisionZ } from '@/core/raster/rasterTracingCpuDepth'
import { traceSampledPathGpuDepths } from '@/core/raster/rasterTracingGpu'
import rasterizeShaderCode from '@/shaders/planar-rasterize.wgsl?raw'
import toolpathShaderCode from '@/shaders/planar-toolpath.wgsl?raw'
import tracingShaderCode from '@/shaders/tracing-toolpath.wgsl?raw'

declare const self: DedicatedWorkerGlobalScope

const EMPTY_CELL = -1e10
const MAX_TRACING_SAMPLE_POINTS = 200000
let gpuDevice: GPUDevice | null = null
let rasterPipeline: GPUComputePipeline | null = null
let toolpathPipeline: GPUComputePipeline | null = null
let tracingPipeline: GPUComputePipeline | null = null
const gpuBufferPool = new Map<string, { buffer: GPUBuffer; size: number; usage: number }>()
const gpuBufferPoolStats = { hits: 0, misses: 0, reuses: 0, newAllocs: 0 }

type Bounds = {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

function getPooledBuffer(key: string, size: number, usage: number): GPUBuffer {
  if (!gpuDevice) throw new Error('GPU device unavailable')
  const need = Math.max(4, nextPow2(size))
  const hit = gpuBufferPool.get(key)
  if (hit && hit.size >= need && hit.usage === usage) {
    gpuBufferPoolStats.hits += 1
    gpuBufferPoolStats.reuses += 1
    return hit.buffer
  }
  gpuBufferPoolStats.misses += 1
  if (hit) {
    hit.buffer.destroy()
    gpuBufferPool.delete(key)
  }
  const buffer = gpuDevice.createBuffer({ size: need, usage })
  gpuBufferPoolStats.newAllocs += 1
  gpuBufferPool.set(key, { buffer, size: need, usage })
  return buffer
}

function clearGpuBufferPool() {
  gpuBufferPool.forEach((v) => {
    v.buffer.destroy()
  })
  gpuBufferPool.clear()
}

function calcBounds(triangles: Float32Array): Bounds {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < triangles.length; i += 3) {
    const x = triangles[i] ?? 0
    const y = triangles[i + 1] ?? 0
    const z = triangles[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

function pointInTri2D(px: number, py: number, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
  const v0x = cx - ax
  const v0y = cy - ay
  const v1x = bx - ax
  const v1y = by - ay
  const v2x = px - ax
  const v2y = py - ay

  const dot00 = v0x * v0x + v0y * v0y
  const dot01 = v0x * v1x + v0y * v1y
  const dot02 = v0x * v2x + v0y * v2y
  const dot11 = v1x * v1x + v1y * v1y
  const dot12 = v1x * v2x + v1y * v2y
  const inv = dot00 * dot11 - dot01 * dot01
  if (Math.abs(inv) < 1e-12) return false
  const invDenom = 1 / inv
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom
  return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6
}

function triZAtXY(px: number, py: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  if (Math.abs(nz) < 1e-12) return az
  return az - (nx * (px - ax) + ny * (py - ay)) / nz
}

function rasterizeMaxZ2D(triangles: Float32Array, bounds: Bounds, stepX: number, stepY: number, zFloor: number) {
  const width = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / stepX) + 1)
  const height = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / stepY) + 1)
  const zGrid = new Float32Array(width * height)
  zGrid.fill(zFloor)

  for (let i = 0; i < triangles.length; i += 9) {
    const ax = triangles[i] ?? 0
    const ay = triangles[i + 1] ?? 0
    const az = triangles[i + 2] ?? 0
    const bx = triangles[i + 3] ?? 0
    const by = triangles[i + 4] ?? 0
    const bz = triangles[i + 5] ?? 0
    const cx = triangles[i + 6] ?? 0
    const cy = triangles[i + 7] ?? 0
    const cz = triangles[i + 8] ?? 0

    const minX = Math.max(bounds.minX, Math.min(ax, bx, cx))
    const maxX = Math.min(bounds.maxX, Math.max(ax, bx, cx))
    const minY = Math.max(bounds.minY, Math.min(ay, by, cy))
    const maxY = Math.min(bounds.maxY, Math.max(ay, by, cy))

    const x0 = Math.max(0, Math.floor((minX - bounds.minX) / stepX))
    const x1 = Math.min(width - 1, Math.ceil((maxX - bounds.minX) / stepX))
    const y0 = Math.max(0, Math.floor((minY - bounds.minY) / stepY))
    const y1 = Math.min(height - 1, Math.ceil((maxY - bounds.minY) / stepY))

    for (let gy = y0; gy <= y1; gy += 1) {
      const py = bounds.minY + gy * stepY
      for (let gx = x0; gx <= x1; gx += 1) {
        const px = bounds.minX + gx * stepX
        if (!pointInTri2D(px, py, ax, ay, bx, by, cx, cy)) continue
        const z = triZAtXY(px, py, ax, ay, az, bx, by, bz, cx, cy, cz)
        const idx = gy * width + gx
        if (z > (zGrid[idx] ?? Number.NEGATIVE_INFINITY)) zGrid[idx] = z
      }
    }
  }
  return { zGrid, width, height }
}

function rasterizeMaxZ(triangles: Float32Array, bounds: Bounds, resolution: number, zFloor: number) {
  return rasterizeMaxZ2D(triangles, bounds, resolution, resolution, zFloor)
}

function rasterizeToolMin2D(toolTriangles: Float32Array, stepX: number, stepY: number) {
  const tb = calcBounds(toolTriangles)
  const width = Math.max(1, Math.ceil((tb.maxX - tb.minX) / stepX) + 1)
  const height = Math.max(1, Math.ceil((tb.maxY - tb.minY) / stepY) + 1)
  const minGrid = new Float32Array(width * height)
  minGrid.fill(Number.POSITIVE_INFINITY)

  for (let i = 0; i < toolTriangles.length; i += 9) {
    const ax = toolTriangles[i] ?? 0
    const ay = toolTriangles[i + 1] ?? 0
    const az = toolTriangles[i + 2] ?? 0
    const bx = toolTriangles[i + 3] ?? 0
    const by = toolTriangles[i + 4] ?? 0
    const bz = toolTriangles[i + 5] ?? 0
    const cx = toolTriangles[i + 6] ?? 0
    const cy = toolTriangles[i + 7] ?? 0
    const cz = toolTriangles[i + 8] ?? 0

    const minX = Math.max(tb.minX, Math.min(ax, bx, cx))
    const maxX = Math.min(tb.maxX, Math.max(ax, bx, cx))
    const minY = Math.max(tb.minY, Math.min(ay, by, cy))
    const maxY = Math.min(tb.maxY, Math.max(ay, by, cy))
    const x0 = Math.max(0, Math.floor((minX - tb.minX) / stepX))
    const x1 = Math.min(width - 1, Math.ceil((maxX - tb.minX) / stepX))
    const y0 = Math.max(0, Math.floor((minY - tb.minY) / stepY))
    const y1 = Math.min(height - 1, Math.ceil((maxY - tb.minY) / stepY))

    for (let gy = y0; gy <= y1; gy += 1) {
      const py = tb.minY + gy * stepY
      for (let gx = x0; gx <= x1; gx += 1) {
        const px = tb.minX + gx * stepX
        if (!pointInTri2D(px, py, ax, ay, bx, by, cx, cy)) continue
        const z = triZAtXY(px, py, ax, ay, az, bx, by, bz, cx, cy, cz)
        const idx = gy * width + gx
        if (z < (minGrid[idx] ?? Number.POSITIVE_INFINITY)) minGrid[idx] = z
      }
    }
  }

  const samples: Array<{ dx: number; dy: number; z: number }> = []
  const cx = Math.floor(width / 2)
  const cy = Math.floor(height / 2)
  let centerMin = Number.POSITIVE_INFINITY
  for (let i = 0; i < minGrid.length; i += 1) {
    const z = minGrid[i]!
    if (!Number.isFinite(z)) continue
    if (z < centerMin) centerMin = z
  }
  for (let gy = 0; gy < height; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const z = minGrid[gy * width + gx]!
      if (!Number.isFinite(z)) continue
      samples.push({ dx: gx - cx, dy: gy - cy, z: -(z - centerMin) })
    }
  }
  return samples
}

function rasterizeToolMin(toolTriangles: Float32Array, resolution: number) {
  return rasterizeToolMin2D(toolTriangles, resolution, resolution)
}

function toRadialSpace(triangles: Float32Array): Float32Array {
  const out = new Float32Array(triangles.length)
  for (let i = 0; i < triangles.length; i += 3) {
    const x = triangles[i] ?? 0
    const y = triangles[i + 1] ?? 0
    const z = triangles[i + 2] ?? 0
    let theta = (Math.atan2(y, z) * 180) / Math.PI
    if (theta < 0) theta += 360
    const r = Math.hypot(y, z)
    out[i] = x
    out[i + 1] = theta
    out[i + 2] = r
  }
  return out
}

async function ensureGpu() {
  if (gpuDevice && rasterPipeline && toolpathPipeline && tracingPipeline) return
  if (!('gpu' in navigator)) throw new Error('WebGPU not available')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('No WebGPU adapter')
  gpuDevice = await adapter.requestDevice()
  const rasterModule = gpuDevice.createShaderModule({ code: rasterizeShaderCode })
  const toolpathModule = gpuDevice.createShaderModule({ code: toolpathShaderCode })
  const tracingModule = gpuDevice.createShaderModule({ code: tracingShaderCode })
  rasterPipeline = gpuDevice.createComputePipeline({
    layout: 'auto',
    compute: { module: rasterModule, entryPoint: 'main' },
  })
  toolpathPipeline = gpuDevice.createComputePipeline({
    layout: 'auto',
    compute: { module: toolpathModule, entryPoint: 'main' },
  })
  tracingPipeline = gpuDevice.createComputePipeline({
    layout: 'auto',
    compute: { module: tracingModule, entryPoint: 'main' },
  })
}

function buildSpatialGrid(triangles: Float32Array, bounds: Bounds, cellSize = 5) {
  const gridWidth = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize))
  const gridHeight = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / cellSize))
  const totalCells = gridWidth * gridHeight
  const grid: number[][] = Array.from({ length: totalCells }, () => [])
  const triCount = Math.floor(triangles.length / 9)
  for (let t = 0; t < triCount; t += 1) {
    const b = t * 9
    const v0x = triangles[b] ?? 0
    const v0y = triangles[b + 1] ?? 0
    const v1x = triangles[b + 3] ?? 0
    const v1y = triangles[b + 4] ?? 0
    const v2x = triangles[b + 6] ?? 0
    const v2y = triangles[b + 7] ?? 0
    const minX = Math.min(v0x, v1x, v2x)
    const maxX = Math.max(v0x, v1x, v2x)
    const minY = Math.min(v0y, v1y, v2y)
    const maxY = Math.max(v0y, v1y, v2y)
    const sx = Math.max(0, Math.floor((minX - bounds.minX) / cellSize))
    const ex = Math.min(gridWidth - 1, Math.floor((maxX - bounds.minX) / cellSize))
    const sy = Math.max(0, Math.floor((minY - bounds.minY) / cellSize))
    const ey = Math.min(gridHeight - 1, Math.floor((maxY - bounds.minY) / cellSize))
    for (let y = sy; y <= ey; y += 1) for (let x = sx; x <= ex; x += 1) grid[y * gridWidth + x]!.push(t)
  }
  const offsets = new Uint32Array(totalCells + 1)
  let totalRefs = 0
  for (let i = 0; i < totalCells; i += 1) {
    offsets[i] = totalRefs
    totalRefs += grid[i]!.length
  }
  offsets[totalCells] = totalRefs
  const triIndices = new Uint32Array(totalRefs)
  let k = 0
  for (let i = 0; i < totalCells; i += 1) for (const idx of grid[i]!) triIndices[k++] = idx
  return { gridWidth, gridHeight, cellSize, cellOffsets: offsets, triangleIndices: triIndices }
}

async function gpuRasterizePlanar(
  triangles: Float32Array,
  bounds: Bounds,
  stepX: number,
  stepY: number,
  filterMode: 0 | 1,
  zFloor: number,
) {
  await ensureGpu()
  if (!gpuDevice || !rasterPipeline) throw new Error('GPU pipeline unavailable')
  const gridWidth = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / stepX) + 1)
  const gridHeight = Math.max(1, Math.ceil((bounds.maxY - bounds.minY) / stepY) + 1)
  const total = gridWidth * gridHeight
  const spatial = buildSpatialGrid(triangles, bounds, 5)

  const triangleBuffer = getPooledBuffer(
    'raster:triangles',
    triangles.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(triangleBuffer, 0, triangles)

  const outputFloats = filterMode === 0 ? total : total * 3
  const outputBuffer = getPooledBuffer(
    `raster:output:${filterMode}`,
    outputFloats * 4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  )
  if (filterMode === 0) {
    const init = new Float32Array(total)
    init.fill(zFloor)
    gpuDevice.queue.writeBuffer(outputBuffer, 0, init)
  }
  const validMaskBuffer = getPooledBuffer(
    `raster:validmask:${filterMode}`,
    total * 4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  )
  const cellOffsetBuffer = getPooledBuffer(
    'raster:cellOffsets',
    spatial.cellOffsets.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(cellOffsetBuffer, 0, spatial.cellOffsets)
  const triIdxBuffer = getPooledBuffer(
    'raster:triangleIndices',
    spatial.triangleIndices.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(triIdxBuffer, 0, spatial.triangleIndices)

  const uniforms = new Float32Array(15)
  uniforms[0] = bounds.minX
  uniforms[1] = bounds.minY
  uniforms[2] = bounds.minZ
  uniforms[3] = bounds.maxX
  uniforms[4] = bounds.maxY
  uniforms[5] = bounds.maxZ
  uniforms[6] = stepX
  uniforms[7] = stepY
  const u32 = new Uint32Array(uniforms.buffer)
  u32[8] = gridWidth
  u32[9] = gridHeight
  u32[10] = Math.floor(triangles.length / 9)
  u32[11] = filterMode
  u32[12] = spatial.gridWidth
  u32[13] = spatial.gridHeight
  uniforms[14] = spatial.cellSize
  const uniformBuffer = getPooledBuffer(
    'raster:uniforms',
    uniforms.byteLength,
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(uniformBuffer, 0, uniforms)

  const bindGroup = gpuDevice.createBindGroup({
    layout: rasterPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: triangleBuffer } },
      { binding: 1, resource: { buffer: outputBuffer } },
      { binding: 2, resource: { buffer: validMaskBuffer } },
      { binding: 3, resource: { buffer: uniformBuffer } },
      { binding: 4, resource: { buffer: cellOffsetBuffer } },
      { binding: 5, resource: { buffer: triIdxBuffer } },
    ],
  })

  const encoder = gpuDevice.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(rasterPipeline)
  pass.setBindGroup(0, bindGroup)
  pass.dispatchWorkgroups(Math.ceil(gridWidth / 16), Math.ceil(gridHeight / 16))
  pass.end()

  const outStage = getPooledBuffer(
    `raster:outStage:${filterMode}`,
    outputFloats * 4,
    GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  )
  const maskStage = getPooledBuffer(
    `raster:maskStage:${filterMode}`,
    total * 4,
    GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  )
  encoder.copyBufferToBuffer(outputBuffer, 0, outStage, 0, outputFloats * 4)
  encoder.copyBufferToBuffer(validMaskBuffer, 0, maskStage, 0, total * 4)
  gpuDevice.queue.submit([encoder.finish()])
  await gpuDevice.queue.onSubmittedWorkDone()
  await outStage.mapAsync(GPUMapMode.READ)
  await maskStage.mapAsync(GPUMapMode.READ)

  const outputData = new Float32Array(outStage.getMappedRange().slice(0))
  const validMask = new Uint32Array(maskStage.getMappedRange().slice(0))
  outStage.unmap()
  maskStage.unmap()

  if (filterMode === 0) {
    return { kind: 'terrain' as const, zGrid: outputData, width: gridWidth, height: gridHeight }
  }

  const samples: Array<{ dx: number; dy: number; z: number }> = []
  const cx = Math.floor(gridWidth / 2)
  const cy = Math.floor(gridHeight / 2)
  let centerMin = Number.POSITIVE_INFINITY
  for (let i = 0; i < total; i += 1) {
    if (validMask[i] !== 1) continue
    const z = outputData[i * 3 + 2]!
    if (z < centerMin) centerMin = z
  }
  for (let i = 0; i < total; i += 1) {
    if (validMask[i] !== 1) continue
    const gx = outputData[i * 3]!
    const gy = outputData[i * 3 + 1]!
    const z = outputData[i * 3 + 2]!
    samples.push({ dx: Math.round(gx - cx), dy: Math.round(gy - cy), z: -(z - centerMin) })
  }
  return { kind: 'tool' as const, samples, width: gridWidth, height: gridHeight }
}

async function gpuGeneratePlanarPaths(
  terrain: Float32Array,
  terrainWidth: number,
  terrainHeight: number,
  toolSamples: Array<{ dx: number; dy: number; z: number }>,
  xStep: number,
  yStep: number,
  zFloor: number,
  bounds: Bounds,
  stepXWorld: number,
  stepYWorld: number,
) {
  await ensureGpu()
  if (!gpuDevice || !toolpathPipeline) throw new Error('GPU pipeline unavailable')
  const pointsPerLine = Math.ceil(terrainWidth / xStep)
  const numScanlines = Math.ceil(terrainHeight / yStep)
  const outCount = pointsPerLine * numScanlines

  const terrainBuffer = getPooledBuffer(
    'toolpath:terrain',
    terrain.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(terrainBuffer, 0, terrain)
  const toolBuf = new ArrayBuffer(Math.max(1, toolSamples.length) * 16)
  const toolI32 = new Int32Array(toolBuf)
  const toolF32 = new Float32Array(toolBuf)
  for (let i = 0; i < toolSamples.length; i += 1) {
    const s = toolSamples[i]!
    toolI32[i * 4] = s.dx
    toolI32[i * 4 + 1] = s.dy
    // Shader expects positive offset-from-tip; CPU path stores inverse sign.
    toolF32[i * 4 + 2] = -s.z
  }
  const toolBuffer = getPooledBuffer(
    'toolpath:tool',
    toolBuf.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(toolBuffer, 0, toolBuf)
  const outputBuffer = getPooledBuffer(
    'toolpath:output',
    outCount * 4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  )
  const uniform = new Uint32Array(9)
  uniform[0] = terrainWidth
  uniform[1] = terrainHeight
  uniform[2] = toolSamples.length
  uniform[3] = xStep
  uniform[4] = yStep
  const uf = new Float32Array(uniform.buffer)
  uf[5] = zFloor
  uniform[6] = pointsPerLine
  uniform[7] = numScanlines
  uniform[8] = 0
  const uniformBuffer = getPooledBuffer(
    'toolpath:uniform',
    uniform.byteLength,
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  )
  gpuDevice.queue.writeBuffer(uniformBuffer, 0, uniform)

  const bind = gpuDevice.createBindGroup({
    layout: toolpathPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: terrainBuffer } },
      { binding: 1, resource: { buffer: toolBuffer } },
      { binding: 2, resource: { buffer: outputBuffer } },
      { binding: 3, resource: { buffer: uniformBuffer } },
    ],
  })
  const encoder = gpuDevice.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(toolpathPipeline)
  pass.setBindGroup(0, bind)
  pass.dispatchWorkgroups(Math.ceil(pointsPerLine / 16), Math.ceil(numScanlines / 16))
  pass.end()
  const stage = getPooledBuffer(
    'toolpath:stage',
    outCount * 4,
    GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  )
  encoder.copyBufferToBuffer(outputBuffer, 0, stage, 0, outCount * 4)
  gpuDevice.queue.submit([encoder.finish()])
  await gpuDevice.queue.onSubmittedWorkDone()
  await stage.mapAsync(GPUMapMode.READ)
  const zOut = new Float32Array(stage.getMappedRange().slice(0))
  stage.unmap()

  const paths: RasterPath[] = []
  for (let sy = 0; sy < numScanlines; sy += 1) {
    const points: Array<[number, number, number]> = []
    for (let sx = 0; sx < pointsPerLine; sx += 1) {
      const idx = sy * pointsPerLine + sx
      const wx = bounds.minX + sx * xStep * stepXWorld
      const wy = bounds.minY + sy * yStep * stepYWorld
      points.push([wx, wy, zOut[idx] ?? zFloor])
    }
    paths.push({ points })
  }
  return paths
}

function postRasterProgress(phase: string, percent: number) {
  postMessage({ kind: 'progress', phase, percent })
}

function postRasterResult(result: RasterResult) {
  const msg: RasterWorkerResultMessage = { kind: 'result', result }
  postMessage(msg)
}

self.onmessage = async (ev: MessageEvent) => {
  postRasterProgress('start', 0)
  gpuBufferPoolStats.hits = 0
  gpuBufferPoolStats.misses = 0
  gpuBufferPoolStats.reuses = 0
  gpuBufferPoolStats.newAllocs = 0
  const runStart = performance.now()
  const data = ev.data as RasterRequest
  if (data.resetGpuBufferPool) clearGpuBufferPool()
  const preferredEngine = data.preferredEngine ?? 'auto'
  const allowGpu = preferredEngine !== 'cpu'
  const cfg = data.config
  const mode = cfg.mode ?? 'planar'
  const resolution = Math.max(0.01, cfg.resolution || 0.5)
  const rotationStep = Math.max(0.1, cfg.rotationStep || 5)
  const xStep = Math.max(1, Math.floor(cfg.xStep || 5))
  const yStep = Math.max(1, Math.floor(cfg.yStep || 5))
  const tracingStep = Math.max(0.01, cfg.tracingStep || 1)
  const zFloor = Number.isFinite(cfg.zFloor) ? cfg.zFloor : -100

  postRasterProgress('rasterize', 0.15)
  let terrainBounds = calcBounds(data.terrainTriangles)
  let terrain = rasterizeMaxZ(data.terrainTriangles, terrainBounds, resolution, zFloor)
  let tool = rasterizeToolMin(data.toolTriangles, resolution)
  postRasterProgress('toolpath', 0.45)
  let stepX = resolution
  let stepY = resolution
  let usedGpu = false
  const gpuStagesMs = { rasterize: 0, toolpath: 0, tracing: 0, totalGpu: 0 }
  const gpuRunStart = performance.now()
  let tracingBudget:
    | {
        maxPoints: number
        normalizedPoints: number
        sampledPoints: number
        finalPoints: number
        fallbackScale: number
        budgetApplied: boolean
      }
    | undefined

  if (mode === 'planar' && allowGpu) {
    try {
      const tRaster = performance.now()
      const terrainGpu = await gpuRasterizePlanar(data.terrainTriangles, terrainBounds, resolution, resolution, 0, zFloor)
      const toolBounds = calcBounds(data.toolTriangles)
      const toolGpu = await gpuRasterizePlanar(data.toolTriangles, toolBounds, resolution, resolution, 1, zFloor)
      gpuStagesMs.rasterize += performance.now() - tRaster
      if (terrainGpu.kind === 'terrain' && toolGpu.kind === 'tool') {
        const tToolpath = performance.now()
        const gpuPaths = await gpuGeneratePlanarPaths(
          terrainGpu.zGrid,
          terrainGpu.width,
          terrainGpu.height,
          toolGpu.samples,
          xStep,
          yStep,
          zFloor,
          terrainBounds,
          resolution,
          resolution,
        )
        gpuStagesMs.toolpath += performance.now() - tToolpath
        gpuStagesMs.totalGpu = performance.now() - gpuRunStart
        const pointCount = gpuPaths.reduce((acc, p) => acc + p.points.length, 0)
        const result: RasterResult = {
          paths: gpuPaths,
          summary: {
            pathCount: gpuPaths.length,
            pointCount,
            engine: 'webgpu',
            elapsedMs: performance.now() - runStart,
            gpuBufferPool: { ...gpuBufferPoolStats },
            gpuStagesMs: {
              rasterize: Number(gpuStagesMs.rasterize.toFixed(2)),
              toolpath: Number(gpuStagesMs.toolpath.toFixed(2)),
              tracing: Number(gpuStagesMs.tracing.toFixed(2)),
              totalGpu: Number(gpuStagesMs.totalGpu.toFixed(2)),
            },
          },
        }
        postRasterProgress('done', 1)
        postRasterResult(result)
        return
      }
    } catch {
      // Fallback to CPU path
    }
  } else if (mode === 'tracing' && allowGpu) {
    try {
      const tRaster = performance.now()
      const terrainGpu = await gpuRasterizePlanar(data.terrainTriangles, terrainBounds, resolution, resolution, 0, zFloor)
      const toolBounds = calcBounds(data.toolTriangles)
      const toolGpu = await gpuRasterizePlanar(data.toolTriangles, toolBounds, resolution, resolution, 1, zFloor)
      gpuStagesMs.rasterize += performance.now() - tRaster
      if (terrainGpu.kind === 'terrain' && toolGpu.kind === 'tool') {
        terrain = { zGrid: terrainGpu.zGrid, width: terrainGpu.width, height: terrainGpu.height }
        tool = toolGpu.samples
        usedGpu = true
      }
    } catch {
      // Fallback to CPU rasterization for tracing pre-stage
    }
  } else if (mode === 'radial') {
    const radialTerrain = toRadialSpace(data.terrainTriangles)
    const radialTool = toRadialSpace(data.toolTriangles)
    terrainBounds = calcBounds(radialTerrain)
    if (allowGpu) {
      try {
        const tRaster = performance.now()
        const terrainGpu = await gpuRasterizePlanar(radialTerrain, terrainBounds, resolution, rotationStep, 0, zFloor)
        const toolBounds = calcBounds(radialTool)
        const toolGpu = await gpuRasterizePlanar(radialTool, toolBounds, resolution, rotationStep, 1, zFloor)
        gpuStagesMs.rasterize += performance.now() - tRaster
        if (terrainGpu.kind === 'terrain' && toolGpu.kind === 'tool') {
          const tToolpath = performance.now()
          const gpuPaths = await gpuGeneratePlanarPaths(
            terrainGpu.zGrid,
            terrainGpu.width,
            terrainGpu.height,
            toolGpu.samples,
            xStep,
            yStep,
            zFloor,
            terrainBounds,
            resolution,
            rotationStep,
          )
          gpuStagesMs.toolpath += performance.now() - tToolpath
          gpuStagesMs.totalGpu = performance.now() - gpuRunStart
          const pointCount = gpuPaths.reduce((acc, p) => acc + p.points.length, 0)
          const result: RasterResult = {
            paths: gpuPaths,
            summary: {
              pathCount: gpuPaths.length,
              pointCount,
              engine: 'webgpu',
              elapsedMs: performance.now() - runStart,
              gpuBufferPool: { ...gpuBufferPoolStats },
              gpuStagesMs: {
                rasterize: Number(gpuStagesMs.rasterize.toFixed(2)),
                toolpath: Number(gpuStagesMs.toolpath.toFixed(2)),
                tracing: Number(gpuStagesMs.tracing.toFixed(2)),
                totalGpu: Number(gpuStagesMs.totalGpu.toFixed(2)),
              },
            },
          }
          postRasterProgress('done', 1)
        postRasterResult(result)
          return
        }
      } catch {
        // Fallback to CPU radial path
      }
    }
    terrain = rasterizeMaxZ2D(radialTerrain, terrainBounds, resolution, rotationStep, zFloor)
    tool = rasterizeToolMin2D(radialTool, resolution, rotationStep)
    stepY = rotationStep
  }

  const paths: RasterPath[] = []
  const sampleAt = (wx: number, wy: number) =>
    computeRasterTracingCollisionZ(wx, wy, terrain, tool, terrainBounds, stepX, stepY, zFloor)

  if (mode === 'tracing') {
    const tracingPaths = normalizeTracingPaths(data.tracingPaths ?? [], tracingStep)
    const normalizedPoints = countTracingPoints(tracingPaths.map((p) => p.points))
    let sampledPaths = tracingPaths.map((p) => sampleTracingPolyline(p.points, tracingStep))
    const sampledPoints = countTracingPoints(sampledPaths)
    let fallbackScale = 1
    if (sampledPoints > MAX_TRACING_SAMPLE_POINTS) {
      const scale = Math.ceil(sampledPoints / MAX_TRACING_SAMPLE_POINTS)
      const fallbackStep = tracingStep * scale
      sampledPaths = tracingPaths.map((p) => sampleTracingPolyline(p.points, fallbackStep))
      fallbackScale = scale
    }
    const afterFallbackPoints = countTracingPoints(sampledPaths)
    sampledPaths = enforceTracingPointBudget(sampledPaths, MAX_TRACING_SAMPLE_POINTS)
    const finalPoints = countTracingPoints(sampledPaths)
    tracingBudget = {
      maxPoints: MAX_TRACING_SAMPLE_POINTS,
      normalizedPoints,
      sampledPoints,
      finalPoints,
      fallbackScale,
      budgetApplied: fallbackScale > 1 || finalPoints < afterFallbackPoints,
    }
    for (let i = 0; i < sampledPaths.length; i += 1) {
      const sampled = sampledPaths[i]
      if (!sampled?.length) continue
      if (allowGpu) {
        try {
          const tTracing = performance.now()
          const pts = await traceSampledPathGpuDepths(
            {
              device: gpuDevice!,
              pipeline: tracingPipeline!,
              getBuffer: getPooledBuffer,
            },
            {
              sampledXY: sampled,
              terrain,
              tool,
              bounds: terrainBounds,
              resolution,
              zFloor,
            },
          )
          gpuStagesMs.tracing += performance.now() - tTracing
          usedGpu = true
          if (pts.length) paths.push({ points: pts })
        } catch {
          const pts: Array<[number, number, number]> = []
          for (const [x, y] of sampled) {
            pts.push([x, y, sampleAt(x, y)])
          }
          if (pts.length) paths.push({ points: pts })
        }
      } else {
        const pts: Array<[number, number, number]> = []
        for (const [x, y] of sampled) {
          pts.push([x, y, sampleAt(x, y)])
        }
        if (pts.length) paths.push({ points: pts })
      }
    }
  } else {
    for (let gy = 0; gy < terrain.height; gy += yStep) {
      const points: Array<[number, number, number]> = []
      for (let gx = 0; gx < terrain.width; gx += xStep) {
        const wx = terrainBounds.minX + gx * stepX
        const wy = terrainBounds.minY + gy * stepY
        points.push([wx, wy, sampleAt(wx, wy)])
      }
      if (points.length) paths.push({ points })
    }
  }

  const pointCount = paths.reduce((acc, p) => acc + p.points.length, 0)
  if (usedGpu) gpuStagesMs.totalGpu = performance.now() - gpuRunStart
  const result: RasterResult = {
    paths,
    summary: {
      pathCount: paths.length,
      pointCount,
      engine: usedGpu ? 'webgpu' : 'cpu',
      elapsedMs: performance.now() - runStart,
      tracingBudget,
      gpuBufferPool: usedGpu ? { ...gpuBufferPoolStats } : undefined,
      gpuStagesMs: usedGpu
        ? {
            rasterize: Number(gpuStagesMs.rasterize.toFixed(2)),
            toolpath: Number(gpuStagesMs.toolpath.toFixed(2)),
            tracing: Number(gpuStagesMs.tracing.toFixed(2)),
            totalGpu: Number(gpuStagesMs.totalGpu.toFixed(2)),
          }
        : undefined,
    },
  }

  postRasterProgress('done', 1)
  postRasterResult(result)
}
