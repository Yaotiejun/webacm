import { createHash } from 'node:crypto'
import { sampleTracingPathGripStep } from '@/core/raster/rasterGripTracingSamplePath'
import { traceSampledPathCpuDepths } from '@/core/raster/rasterTracingCpuDepth'
import { RASTER_TRACING_GOLDEN_RECT } from '@/core/raster/rasterTracingDepthGolden'
import {
  RASTER_TRACING_FLAT_BOUNDS,
  RASTER_TRACING_UNIT_TOOL,
} from '@/core/raster/rasterTracingCpuDepthGolden'
import type { RasterTerrainGrid, RasterTraceBounds } from '@/core/raster/rasterTracingCpuDepth'
import { calcBoundsFromStlTriangles } from '@/core/raster/rasterStlBounds'
import { rasterizeTerrainZGridFromTriangles } from '@/core/raster/rasterStlTerrainGrid'

export const RASTER_GRIP_STL_TRACING_STEP = 2
/** Coarser grid for migration gate (full 0.05 is live golden only). */
export const RASTER_GRIP_STL_TRACING_RESOLUTION = 1

/**
 * Pinned CPU tracing Z SHA on synced `public/grip-raster-fixtures/terrain.stl` (rect path, step=2).
 * Update after fixture or raster algorithm change.
 */
export const RASTER_GRIP_STL_CPU_Z_SHA256 =
  'b0b9c772ef9bde63de998d61a55f7e5066018f5e0214c1175c36b29ab989ea0e'

export function sha256Float32Z(values: ReadonlyArray<number>): string {
  const buf = new Float32Array(values)
  return createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex')
}

export function offsetRectPathToBoundsCenter(
  bounds: RasterTraceBounds,
  rect: ReadonlyArray<readonly [number, number]> = RASTER_TRACING_GOLDEN_RECT,
): Array<[number, number]> {
  const spanX = Math.max(...rect.map((p) => p[0] ?? 0))
  const spanY = Math.max(...rect.map((p) => p[1] ?? 0))
  const ox = (bounds.minX + bounds.maxX) / 2 - spanX / 2
  const oy = (bounds.minY + bounds.maxY) / 2 - spanY / 2
  return rect.map(([x, y]) => [x + ox, y + oy] as [number, number])
}

export function traceGripRectOnTerrainGrid(
  terrainTriangles: Float32Array,
  tracingStep = RASTER_GRIP_STL_TRACING_STEP,
  resolution = RASTER_GRIP_STL_TRACING_RESOLUTION,
): { pointCount: number; sha256: string; bounds: RasterTraceBounds; terrain: RasterTerrainGrid } {
  const bounds = calcBoundsFromStlTriangles(terrainTriangles)
  const terrain = rasterizeTerrainZGridFromTriangles(terrainTriangles, bounds, resolution)
  const path = sampleTracingPathGripStep(offsetRectPathToBoundsCenter(bounds), tracingStep)
  const depths = traceSampledPathCpuDepths(
    path,
    terrain,
    RASTER_TRACING_UNIT_TOOL,
    bounds,
    resolution,
    resolution,
    -100,
  )
  const z = depths.map((p) => p[2]!)
  return {
    pointCount: z.length,
    sha256: sha256Float32Z(z),
    bounds,
    terrain,
  }
}
