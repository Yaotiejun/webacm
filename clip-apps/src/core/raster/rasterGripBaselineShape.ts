import type { RasterPath } from '@/types/raster'
import {
  GRIP_PLANAR_BASELINE_EXPECTATIONS,
  GRIP_RADIAL_BASELINE_EXPECTATIONS,
} from '@/core/raster/rasterGripBaselineExpectations'
import { flattenRasterPathsZ, gripPlanarPathsChecksum, gripRadialPathsChecksum } from '@/core/raster/rasterGripPathChecksum'

export function buildGripPlanarBaselineShapedPaths(fillZ = 0): RasterPath[] {
  const e = GRIP_PLANAR_BASELINE_EXPECTATIONS
  const paths: RasterPath[] = []
  for (let s = 0; s < e.numScanlines; s += 1) {
    const points: [number, number, number][] = []
    for (let p = 0; p < e.pointsPerLine; p += 1) {
      points.push([p, s, fillZ])
    }
    paths.push({ points })
  }
  return paths
}

export function buildGripRadialBaselineShapedPaths(fillZ = 10): RasterPath[] {
  const e = GRIP_RADIAL_BASELINE_EXPECTATIONS
  const perStrip = Math.floor(e.totalPoints / e.numStrips)
  const paths: RasterPath[] = []
  for (let s = 0; s < e.numStrips; s += 1) {
    const points: [number, number, number][] = []
    for (let p = 0; p < perStrip; p += 1) {
      points.push([p, s, fillZ])
    }
    paths.push({ points })
  }
  return paths
}

export function summarizeGripBaselinePaths(paths: RasterPath[]) {
  let pointCount = 0
  for (const p of paths) pointCount += p.points.length
  return { pathCount: paths.length, pointCount }
}

export function gripPlanarBaselineShapeChecksum(paths: RasterPath[]): number {
  return gripPlanarPathsChecksum(paths)
}

export function gripRadialBaselineShapeChecksum(paths: RasterPath[]): number {
  return gripRadialPathsChecksum(paths)
}

export function flattenGripBaselineZ(paths: RasterPath[]): number[] {
  return flattenRasterPathsZ(paths)
}
