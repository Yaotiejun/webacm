/**
 * One-off / debug: dump fdm_slice path geometry for a 10³ cube and compare
 * raw Z-up verts vs the FDM UI export path (Z-up geometry under displayRoot
 * with rotation.x = -PI/2, then exportMeshesVerticesInSpace — no swizzle).
 *
 * Run: npx vitest run src/core/slicer/fdmSliceCubeDebug.spec.ts
 */
import { describe, it } from 'vitest'
import * as THREE from 'three'
import type { FdmProcess } from '@/types/process'
import type { SliceLayerPreview, SlicePath2D } from '@/api/slice'
import { buildKiriSettingsPayload } from './kiriSettingsAdapter'
import { runLegacyFdmSliceBridge } from './kiriLegacyBridge'
import { resolveLegacyFdmMode } from './kiriRuntimePolicy'
import {
  exportMeshesVerticesInSpace,
  seatObjectOnBedZ,
} from '@/core/mesh/fdmMeshOrient'

function minimalProcess(): FdmProcess {
  return {
    processName: 'test',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 210,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
    sliceSupportAngle: 55,
    outputRetractDist: 0.5,
    outputRetractSpeed: 30,
    outputFanSpeed: 0,
    outputFanLayer: 0,
    outputMinLayerTime: 0,
    zHopDistance: 0,
    enableBrim: false,
    brimCount: 0,
    brimOffset: 0,
    enableRaft: false,
    raftSpacing: 0,
    ranges: [],
    sliceAdaptive: false,
  }
}

/** Unit cube as 12 triangles (36 vertices) — same as kiriLegacyFdmSlice.integration.spec.ts */
function cubeVertices(): Float32Array {
  return new Float32Array([
    0, 0, 0, 10, 0, 0, 10, 10, 0,
    0, 0, 0, 10, 10, 0, 0, 10, 0,
    0, 0, 10, 10, 10, 10, 10, 0, 10,
    0, 0, 10, 0, 10, 10, 10, 10, 10,
    0, 0, 0, 0, 10, 10, 0, 10, 0,
    0, 0, 0, 0, 0, 10, 0, 10, 10,
    10, 0, 0, 10, 10, 0, 10, 10, 10,
    10, 0, 0, 10, 10, 10, 10, 0, 10,
    0, 0, 0, 10, 0, 10, 10, 0, 0,
    0, 0, 0, 0, 0, 10, 10, 0, 10,
    0, 10, 0, 0, 10, 10, 10, 10, 10,
    0, 10, 0, 10, 10, 10, 10, 10, 0,
  ])
}

/**
 * FDM UI path: keep Z-up geometry, parent under displayRoot (rotation.x = -PI/2),
 * export platform-local verts via exportMeshesVerticesInSpace (no swizzle).
 */
function applyDisplayRootExport(zUp: Float32Array): Float32Array {
  const displayRoot = new THREE.Group()
  displayRoot.rotation.x = -Math.PI / 2

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(zUp), 3))
  const mesh = new THREE.Mesh(geom)
  seatObjectOnBedZ(mesh)
  displayRoot.add(mesh)
  displayRoot.updateMatrixWorld(true)

  return exportMeshesVerticesInSpace([mesh], displayRoot)
}

type Aabb = { minX: number; minY: number; maxX: number; maxY: number }

function pathAabb(path: SlicePath2D): Aabb | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of path.points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (!(maxX >= minX) || !(maxY >= minY)) return null
  return { minX, minY, maxX, maxY }
}

function layerAabb(layer: SliceLayerPreview): Aabb | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const path of layer.paths) {
    const b = pathAabb(path)
    if (!b) continue
    if (b.minX < minX) minX = b.minX
    if (b.minY < minY) minY = b.minY
    if (b.maxX > maxX) maxX = b.maxX
    if (b.maxY > maxY) maxY = b.maxY
  }
  if (!(maxX >= minX) || !(maxY >= minY)) return null
  return { minX, minY, maxX, maxY }
}

function aspect(b: Aabb): number {
  const dx = b.maxX - b.minX
  const dy = b.maxY - b.minY
  if (!(dy > 0)) return Number.POSITIVE_INFINITY
  return dx / dy
}

const EPS = 1e-4

function isAxisAlignedSegment(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < EPS || Math.abs(a[1] - b[1]) < EPS
}

/** Closed polyline with only AA edges and exactly 2 distinct X and 2 distinct Y → rectangle. */
function isAxisAlignedRectangle(path: SlicePath2D): boolean {
  const pts = path.points
  if (pts.length < 4) return false
  const uniq: Array<[number, number]> = []
  for (const p of pts) {
    const last = uniq[uniq.length - 1]
    if (last && Math.abs(last[0] - p[0]) < EPS && Math.abs(last[1] - p[1]) < EPS) continue
    uniq.push([p[0], p[1]])
  }
  if (uniq.length >= 2) {
    const f = uniq[0]!
    const l = uniq[uniq.length - 1]!
    if (Math.abs(f[0] - l[0]) < EPS && Math.abs(f[1] - l[1]) < EPS) uniq.pop()
  }
  if (uniq.length !== 4) return false
  for (let i = 0; i < 4; i++) {
    if (!isAxisAlignedSegment(uniq[i]!, uniq[(i + 1) % 4]!)) return false
  }
  const xs = new Set(uniq.map((p) => p[0].toFixed(4)))
  const ys = new Set(uniq.map((p) => p[1].toFixed(4)))
  return xs.size === 2 && ys.size === 2
}

function classifyPaths(layers: SliceLayerPreview[]) {
  let closedLike = 0
  let aaRect = 0
  let openSegments = 0
  let nonRectClosed = 0
  let maxPoints = 0
  for (const layer of layers) {
    for (const path of layer.paths) {
      maxPoints = Math.max(maxPoints, path.points.length)
      const first = path.points[0]
      const last = path.points[path.points.length - 1]
      const closed =
        first &&
        last &&
        Math.abs(first[0] - last[0]) < EPS &&
        Math.abs(first[1] - last[1]) < EPS &&
        path.points.length >= 4
      if (!closed) {
        openSegments++
        continue
      }
      closedLike++
      if (isAxisAlignedRectangle(path)) aaRect++
      else nonRectClosed++
    }
  }
  const onlyAaRects = closedLike > 0 && nonRectClosed === 0 && openSegments === 0
  const avgClosedPerLayer = layers.length ? closedLike / layers.length : 0
  // Classic placeholder: one AABB outline per layer. Real cube shells: ≥2 offset AA rects.
  const singleRectPerLayer = onlyAaRects && avgClosedPerLayer <= 1.05 && maxPoints <= 5
  const cubeShellLike = onlyAaRects && avgClosedPerLayer >= 1.5 && maxPoints <= 5
  return {
    closedLike,
    aaRect,
    openSegments,
    nonRectClosed,
    maxPoints,
    avgClosedPerLayer,
    onlyAaRects,
    singleRectPerLayer,
    cubeShellLike,
    verdict: singleRectPerLayer
      ? 'placeholder-like (one AA rectangle per layer)'
      : cubeShellLike && openSegments === 0
        ? 'cube shells (offset AA rectangles; no fill segments in preview)'
        : nonRectClosed > 0
          ? 'real contours (non-rectangular closed paths present)'
          : openSegments > 0
            ? 'real-ish (open segments / fill lines + shells)'
            : 'AA rectangles only',
  }
}

function fmtPt(p: [number, number]): string {
  return `(${p[0].toFixed(4)}, ${p[1].toFixed(4)})`
}

function fmtAabb(b: Aabb | null): string {
  if (!b) return 'null'
  return `min=(${b.minX.toFixed(4)},${b.minY.toFixed(4)}) max=(${b.maxX.toFixed(4)},${b.maxY.toFixed(4)}) dx=${(b.maxX - b.minX).toFixed(4)} dy=${(b.maxY - b.minY).toFixed(4)}`
}

function printLayers(label: string, layers: SliceLayerPreview[], bounds: Aabb | null) {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${label} ===`)
  // eslint-disable-next-line no-console
  console.log(`layerCount=${layers.length}`)
  // eslint-disable-next-line no-console
  console.log(`previewBounds=${fmtAabb(bounds)}`)
  const n = Math.min(3, layers.length)
  for (let i = 0; i < n; i++) {
    const layer = layers[i]!
    const la = layerAabb(layer)
    // eslint-disable-next-line no-console
    console.log(`\n-- layer[${i}] z=${layer.z} pathCount=${layer.paths.length} layerAabb=${fmtAabb(la)} aspect=${la ? aspect(la).toFixed(6) : 'n/a'}`)
    layer.paths.forEach((path, pi) => {
      const aabb = pathAabb(path)
      const first3 = path.points.slice(0, 3).map(fmtPt).join(' ')
      // eslint-disable-next-line no-console
      console.log(
        `  path[${pi}] type=${path.type} points=${path.points.length} first3=[${first3}] aabb=${fmtAabb(aabb)} aaRect=${isAxisAlignedRectangle(path)}`,
      )
    })
  }
  const cls = classifyPaths(layers)
  // eslint-disable-next-line no-console
  console.log(`\npathClassify=${JSON.stringify(cls)}`)
  return cls
}

async function sliceVertices(vertices: Float32Array) {
  const { newPoint } = await import('./kiriLegacyGeo')
  const { fdm_slice } = await import('./kiriLegacyFdmBootstrap')
  const { pointsFromVertices, computeVertexBounds3D } = await import('./geometry')

  const vb = computeVertexBounds3D(vertices)!
  const pts = pointsFromVertices(vertices, newPoint)
  const settings = buildKiriSettingsPayload({
    process: minimalProcess(),
    modelCount: 1,
    deviceProfile: null,
    controllerProfile: null,
  })

  return runLegacyFdmSliceBridge({
    settings,
    vb,
    points: pts,
    fdmSliceImpl: fdm_slice,
    workerScope: globalThis as any,
    timeoutMs: 60_000,
  })
}

describe('fdmSliceCubeDebug', () => {
  it(
    'dumps cube slice paths + displayRoot export comparison',
    async () => {
      // --- localStorage / legacy mode defaults (node/vitest) ---
      const hasLocalStorage =
        typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage != null
      const envRaw = import.meta.env.VITE_KIRI_LEGACY_FDM
      // Same default as kiriEngine.getLegacyFdmMode() (not exported):
      const legacyMode = resolveLegacyFdmMode(envRaw ?? 'auto')
      // eslint-disable-next-line no-console
      console.log(
        `\n[env] typeof localStorage=${typeof globalThis.localStorage} hasLocalStorage=${hasLocalStorage}`,
      )
      // eslint-disable-next-line no-console
      console.log(
        `[env] VITE_KIRI_LEGACY_FDM=${JSON.stringify(envRaw)} getLegacyFdmMode-equivalent=${legacyMode} (default when unset: auto)`,
      )
      // eslint-disable-next-line no-console
      console.log(
        `[env] note: getLegacyFdmMode does NOT read localStorage; only VITE_KIRI_LEGACY_FDM ?? 'auto'`,
      )

      const rawCube = cubeVertices()
      // Raw cube sits on Z=0 with XY in [0,10]; UI seats to center XY on origin.
      // Compare seated raw vs displayRoot export (both Z-up platform space).
      const seatedRaw = (() => {
        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rawCube), 3))
        const mesh = new THREE.Mesh(geom)
        seatObjectOnBedZ(mesh)
        mesh.updateMatrixWorld(true)
        const out = new Float32Array(rawCube.length)
        const v = new THREE.Vector3()
        const pos = geom.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i)
          v.applyMatrix4(mesh.matrixWorld)
          out[i * 3] = v.x
          out[i * 3 + 1] = v.y
          out[i * 3 + 2] = v.z
        }
        return out
      })()
      const uiExported = applyDisplayRootExport(rawCube)

      let vertexMatch = true
      for (let i = 0; i < seatedRaw.length; i++) {
        if (Math.abs(seatedRaw[i]! - uiExported[i]!) > 1e-6) {
          vertexMatch = false
          break
        }
      }
      // eslint-disable-next-line no-console
      console.log(`[displayRoot] seated raw vs exportMeshesVerticesInSpace exactMatch=${vertexMatch}`)

      let rawOut: Awaited<ReturnType<typeof sliceVertices>> | null = null
      let uiOut: Awaited<ReturnType<typeof sliceVertices>> | null = null

      try {
        rawOut = await sliceVertices(seatedRaw)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[seated Z-up] fdm_slice FAILED:', e)
        throw e
      }

      printLayers('seated Z-up cube', rawOut.layers, rawOut.bounds)

      try {
        uiOut = await sliceVertices(uiExported)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[displayRoot export] fdm_slice FAILED:', e)
        throw e
      }

      printLayers('displayRoot exportMeshesVerticesInSpace', uiOut.layers, uiOut.bounds)

      const rawL0 = rawOut.layers[0] ? layerAabb(rawOut.layers[0]) : null
      const uiL0 = uiOut.layers[0] ? layerAabb(uiOut.layers[0]) : null
      const rawAsp = rawL0 ? aspect(rawL0) : NaN
      const uiAsp = uiL0 ? aspect(uiL0) : NaN
      const aspectMatch =
        Number.isFinite(rawAsp) && Number.isFinite(uiAsp) && Math.abs(rawAsp - uiAsp) < 1e-3
      const layerCountMatch = rawOut.layers.length === uiOut.layers.length
      const boundsClose =
        rawOut.bounds &&
        uiOut.bounds &&
        Math.abs(rawOut.bounds.minX - uiOut.bounds.minX) < 0.05 &&
        Math.abs(rawOut.bounds.minY - uiOut.bounds.minY) < 0.05 &&
        Math.abs(rawOut.bounds.maxX - uiOut.bounds.maxX) < 0.05 &&
        Math.abs(rawOut.bounds.maxY - uiOut.bounds.maxY) < 0.05

      // eslint-disable-next-line no-console
      console.log(`\n=== comparison ===`)
      // eslint-disable-next-line no-console
      console.log(
        `seated L0 aspect=${rawAsp.toFixed(6)} displayRoot L0 aspect=${uiAsp.toFixed(6)} aspectMatch=${aspectMatch}`,
      )
      // eslint-disable-next-line no-console
      console.log(
        `layerCount seated=${rawOut.layers.length} displayRoot=${uiOut.layers.length} match=${layerCountMatch}`,
      )
      // eslint-disable-next-line no-console
      console.log(`previewBounds close=${boundsClose}`)
      // eslint-disable-next-line no-console
      console.log(
        `displayRootMatchesSeated=${vertexMatch && aspectMatch && layerCountMatch && !!boundsClose}`,
      )
    },
    180_000,
  )
})
