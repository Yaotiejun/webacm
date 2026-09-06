import type { RasterPath, RasterResult, RasterResultSummary } from '@/types/raster'

export type GripRasterBounds = {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

export type GripPlanarToolpathPayload = {
  pathData: Float32Array
  numScanlines: number
  pointsPerLine: number
  terrainBounds: GripRasterBounds
  gridStep: number
  xStep: number
  yStep: number
  zFloor: number
}

const EMPTY_Z = -1e10

/** Convert grip `generate-toolpath` planar payload into clip-apps `RasterPath[]` (world XYZ). */
export function gripPlanarToolpathToRasterPaths(payload: GripPlanarToolpathPayload): RasterPath[] {
  const { pathData, numScanlines, pointsPerLine, terrainBounds, gridStep, xStep, yStep, zFloor } = payload
  const paths: RasterPath[] = []
  const minX = terrainBounds.min.x
  const minY = terrainBounds.min.y
  const step = Math.max(1e-6, gridStep)

  for (let row = 0; row < numScanlines; row += 1) {
    const points: Array<[number, number, number]> = []
    const gy = row * Math.max(1, yStep)
    for (let col = 0; col < pointsPerLine; col += 1) {
      const z = pathData[row * pointsPerLine + col] ?? zFloor
      if (!Number.isFinite(z) || z <= EMPTY_Z + 1) continue
      const gx = col * Math.max(1, xStep)
      const wx = minX + gx * step
      const wy = minY + gy * step
      points.push([wx, wy, z])
    }
    if (points.length) paths.push({ points })
  }
  return paths
}

export function buildRasterResultFromGripPlanar(
  paths: RasterPath[],
  summaryPatch: Partial<RasterResultSummary> = {},
): RasterResult {
  const pointCount = paths.reduce((acc, p) => acc + p.points.length, 0)
  return {
    paths,
    summary: {
      pathCount: paths.length,
      pointCount,
      engine: 'webgpu',
      ...summaryPatch,
    },
  }
}
