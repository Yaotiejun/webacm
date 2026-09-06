import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GRIP_BASELINE_TERRAIN_VERTICES, GRIP_BASELINE_TOOL_VERTICES } from '@/core/raster/rasterGripBaselineParity'
import { stlTriangleCountFromPositions } from '@/core/raster/stlTriangleCount'

const DEFAULT_TERRAIN_URL = '/grip-raster-fixtures/terrain.stl'
const DEFAULT_TOOL_URL = '/grip-raster-fixtures/tool.stl'

export type GripBaselineStlLoadResult = {
  terrainTriangles: Float32Array
  toolTriangles: Float32Array
  terrainVertexCount: number
  toolVertexCount: number
  meshMatch: boolean
}

function envUrl(key: string, fallback: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key]
  return v?.trim() || fallback
}

async function fetchStlTriangles(url: string): Promise<Float32Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`)
  const buf = await res.arrayBuffer()
  const geo = new STLLoader().parse(buf)
  const pos = geo.getAttribute('position')
  if (!pos?.array?.length) throw new Error(`empty STL geometry: ${url}`)
  return pos.array instanceof Float32Array ? pos.array : new Float32Array(pos.array)
}

/**
 * Load grip planar-baseline STL pair from `public/grip-raster-fixtures/` (see `npm run sync:grip-fixtures`).
 */
export async function loadGripBaselineStlPair(opts?: {
  terrainUrl?: string
  toolUrl?: string
}): Promise<GripBaselineStlLoadResult> {
  const terrainUrl = opts?.terrainUrl ?? envUrl('VITE_GRIP_RASTER_FIXTURE_TERRAIN_URL', DEFAULT_TERRAIN_URL)
  const toolUrl = opts?.toolUrl ?? envUrl('VITE_GRIP_RASTER_FIXTURE_TOOL_URL', DEFAULT_TOOL_URL)
  const [terrainTriangles, toolTriangles] = await Promise.all([
    fetchStlTriangles(terrainUrl),
    fetchStlTriangles(toolUrl),
  ])
  const terrainVertexCount = stlTriangleCountFromPositions(terrainTriangles)
  const toolVertexCount = stlTriangleCountFromPositions(toolTriangles)
  return {
    terrainTriangles,
    toolTriangles,
    terrainVertexCount,
    toolVertexCount,
    meshMatch:
      terrainVertexCount === GRIP_BASELINE_TERRAIN_VERTICES &&
      toolVertexCount === GRIP_BASELINE_TOOL_VERTICES,
  }
}

export function gripBaselineStlSyncHint(): string {
  return 'Run: npm run sync:grip-fixtures (copies grip raster-path-main/benchmark/fixtures → public/grip-raster-fixtures)'
}
