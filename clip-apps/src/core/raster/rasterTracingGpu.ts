/**
 * Shared WebGPU tracing depth (worker + integration parity tests).
 */
import tracingShaderCode from '@/shaders/tracing-toolpath.wgsl?raw'
import {
  maxRasterTracingDepthDelta,
  traceSampledPathCpuDepths,
  type RasterTerrainGrid,
  type RasterToolSample,
  type RasterTraceBounds,
} from '@/core/raster/rasterTracingCpuDepth'

export type RasterTracingGpuBufferAllocator = (
  key: string,
  size: number,
  usage: GPUBufferUsageFlags,
) => GPUBuffer

export interface RasterTracingGpuContext {
  device: GPUDevice
  pipeline: GPUComputePipeline
  getBuffer: RasterTracingGpuBufferAllocator
  /** When set, buffers are destroyed after each `traceSampledPathGpuDepths` call. */
  ephemeralOwned?: GPUBuffer[]
}

export interface RasterTracingGpuTraceInput {
  sampledXY: ReadonlyArray<readonly [number, number]>
  terrain: RasterTerrainGrid
  tool: readonly RasterToolSample[]
  bounds: RasterTraceBounds
  resolution: number
  zFloor: number
}

export interface RasterTracingGpuParityInput extends RasterTracingGpuTraceInput {
  stepX?: number
  stepY?: number
}

export interface RasterTracingGpuParityResult {
  maxDelta: number
  pointCount: number
  usedGpu: boolean
}

let standaloneDevice: GPUDevice | null = null
let standalonePipeline: GPUComputePipeline | null = null

async function ensureStandaloneTracingGpu(): Promise<void> {
  if (standaloneDevice && standalonePipeline) return
  const nav = globalThis.navigator as Navigator & { gpu?: GPU }
  if (!nav?.gpu) throw new Error('WebGPU not available')
  const adapter = await nav.gpu.requestAdapter()
  if (!adapter) throw new Error('No WebGPU adapter')
  standaloneDevice = await adapter.requestDevice()
  const module = standaloneDevice.createShaderModule({ code: tracingShaderCode })
  standalonePipeline = standaloneDevice.createComputePipeline({
    layout: 'auto',
    compute: { module, entryPoint: 'main' },
  })
}

/** Ephemeral buffers (integration tests / one-off traces). */
export async function createRasterTracingGpuContext(): Promise<RasterTracingGpuContext> {
  await ensureStandaloneTracingGpu()
  if (!standaloneDevice || !standalonePipeline) {
    throw new Error('Tracing GPU pipeline unavailable')
  }
  const ephemeralOwned: GPUBuffer[] = []
  const device = standaloneDevice
  return {
    device,
    pipeline: standalonePipeline,
    ephemeralOwned,
    getBuffer(_key, size, usage) {
      const buffer = device.createBuffer({ size: Math.max(4, size), usage })
      ephemeralOwned.push(buffer)
      return buffer
    },
  }
}

function releaseEphemeralBuffers(ctx: RasterTracingGpuContext) {
  if (!ctx.ephemeralOwned?.length) return
  for (const buffer of ctx.ephemeralOwned) buffer.destroy()
  ctx.ephemeralOwned.length = 0
}

/** GPU tracing shader: sampled XY → collision Z (same semantics as worker `gpuTracePathDepths`). */
export async function traceSampledPathGpuDepths(
  ctx: RasterTracingGpuContext,
  input: RasterTracingGpuTraceInput,
): Promise<Array<[number, number, number]>> {
  const { device, pipeline, getBuffer } = ctx
  const { sampledXY, terrain, tool, bounds, resolution, zFloor } = input
  const pointCount = sampledXY.length
  const inputData = new Float32Array(pointCount * 2)
  for (let i = 0; i < pointCount; i += 1) {
    const p = sampledXY[i]!
    inputData[i * 2] = p[0]
    inputData[i * 2 + 1] = p[1]
  }

  const terrainBuffer = getBuffer(
    'tracing:terrain',
    terrain.zGrid.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  device.queue.writeBuffer(terrainBuffer, 0, terrain.zGrid)

  const toolBuf = new ArrayBuffer(Math.max(1, tool.length) * 16)
  const toolI32 = new Int32Array(toolBuf)
  const toolF32 = new Float32Array(toolBuf)
  for (let i = 0; i < tool.length; i += 1) {
    const s = tool[i]!
    toolI32[i * 4] = s.dx
    toolI32[i * 4 + 1] = s.dy
    toolF32[i * 4 + 2] = -s.z
  }
  const toolBuffer = getBuffer(
    'tracing:tool',
    toolBuf.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  device.queue.writeBuffer(toolBuffer, 0, toolBuf)

  const inputBuffer = getBuffer(
    'tracing:input',
    inputData.byteLength,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  device.queue.writeBuffer(inputBuffer, 0, inputData)

  const outputBuffer = getBuffer(
    'tracing:output',
    pointCount * 4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  )

  const zf = new Float32Array([zFloor])
  const maxZInit = new Int32Array(zf.buffer)
  const maxZBuffer = getBuffer(
    'tracing:maxZ',
    4,
    GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  )
  device.queue.writeBuffer(maxZBuffer, 0, maxZInit)

  const uniform = new ArrayBuffer(36)
  const u32 = new Uint32Array(uniform)
  const f32 = new Float32Array(uniform)
  u32[0] = terrain.width
  u32[1] = terrain.height
  u32[2] = tool.length
  u32[3] = pointCount
  u32[4] = 0
  f32[5] = bounds.minX
  f32[6] = bounds.minY
  f32[7] = resolution
  f32[8] = zFloor
  const uniformBuffer = getBuffer(
    'tracing:uniform',
    36,
    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  )
  device.queue.writeBuffer(uniformBuffer, 0, uniform)

  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: terrainBuffer } },
      { binding: 1, resource: { buffer: toolBuffer } },
      { binding: 2, resource: { buffer: inputBuffer } },
      { binding: 3, resource: { buffer: outputBuffer } },
      { binding: 4, resource: { buffer: maxZBuffer } },
      { binding: 5, resource: { buffer: uniformBuffer } },
    ],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginComputePass()
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bind)
  pass.dispatchWorkgroups(Math.ceil(pointCount / 64))
  pass.end()

  const stage = getBuffer(
    'tracing:stage',
    pointCount * 4,
    GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  )
  encoder.copyBufferToBuffer(outputBuffer, 0, stage, 0, pointCount * 4)
  device.queue.submit([encoder.finish()])
  await device.queue.onSubmittedWorkDone()
  await stage.mapAsync(GPUMapMode.READ)
  const depths = new Float32Array(stage.getMappedRange().slice(0))
  stage.unmap()

  releaseEphemeralBuffers(ctx)

  const points: Array<[number, number, number]> = []
  for (let i = 0; i < pointCount; i += 1) {
    const p = sampledXY[i]!
    points.push([p[0], p[1], depths[i] ?? zFloor])
  }
  return points
}

/** Compare GPU tracing shader output to CPU `sampleAt` on the same inputs. */
export async function runRasterTracingGpuCpuParity(
  input: RasterTracingGpuParityInput,
): Promise<RasterTracingGpuParityResult> {
  const stepX = input.stepX ?? 1
  const stepY = input.stepY ?? 1
  const cpu = traceSampledPathCpuDepths(
    input.sampledXY,
    input.terrain,
    input.tool,
    input.bounds,
    stepX,
    stepY,
    input.zFloor,
  )
  const ctx = await createRasterTracingGpuContext()
  const gpu = await traceSampledPathGpuDepths(ctx, input)
  return {
    maxDelta: maxRasterTracingDepthDelta(cpu, gpu),
    pointCount: cpu.length,
    usedGpu: true,
  }
}

export function isRasterTracingWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}
