import {
  GRIP_PLANAR_BASELINE_EXPECTATIONS,
  GRIP_RADIAL_BASELINE_EXPECTATIONS,
} from '@/core/raster/rasterGripBaselineExpectations'
import { GRIP_RASTER_PLANAR_BASELINE, GRIP_RASTER_RADIAL_BASELINE } from '@/core/raster/rasterGripPresets'

/** Subset of grip `test-output/planar-baseline.json` (synced via `npm run sync:grip-fixtures`). */
export type GripPlanarBaselineMetaFile = {
  parameters: {
    mode: string
    resolution: number
    xStep: number
    yStep: number
    zFloor: number
    terrainTriangles: number
    toolTriangles: number
  }
  result: {
    terrainPoints: number
    toolpathSize: number
    numScanlines: number
    pointsPerLine: number
    checksum: number
    sampleValues?: string[]
  }
}

export function validateGripPlanarBaselineMeta(meta: GripPlanarBaselineMetaFile): string[] {
  const issues: string[] = []
  const p = meta.parameters
  const r = meta.result
  const e = GRIP_PLANAR_BASELINE_EXPECTATIONS

  if (p.mode !== 'planar') issues.push(`parameters.mode=${p.mode}`)
  if (p.resolution !== GRIP_RASTER_PLANAR_BASELINE.resolution) {
    issues.push(`resolution ${p.resolution} != ${GRIP_RASTER_PLANAR_BASELINE.resolution}`)
  }
  if (p.terrainTriangles !== e.terrainTriangles) issues.push(`terrainTriangles mismatch`)
  if (p.toolTriangles !== e.toolTriangles) issues.push(`toolTriangles mismatch`)
  if (r.numScanlines !== e.numScanlines) issues.push(`numScanlines ${r.numScanlines} != ${e.numScanlines}`)
  if (r.pointsPerLine !== e.pointsPerLine) issues.push(`pointsPerLine mismatch`)
  if (r.toolpathSize !== e.toolpathSize) issues.push(`toolpathSize mismatch`)
  if (r.checksum !== e.checksum) issues.push(`checksum ${r.checksum} != ${e.checksum}`)

  return issues
}

export function gripRadialMetaChecksumFromGripJson(checksum: number): boolean {
  return checksum === GRIP_RADIAL_BASELINE_EXPECTATIONS.checksum
}

export type GripRadialBaselineMetaFile = {
  parameters: {
    mode: string
    resolution: number
    rotationStep: number
    terrainTriangles: number
    toolTriangles: number
  }
  result: {
    numStrips: number
    totalPoints: number
    checksum: number
    sampleValues?: string[]
  }
}

export function validateGripRadialBaselineMeta(meta: GripRadialBaselineMetaFile): string[] {
  const issues: string[] = []
  const p = meta.parameters
  const r = meta.result
  const e = GRIP_RADIAL_BASELINE_EXPECTATIONS

  if (p.mode !== 'radial') issues.push(`parameters.mode=${p.mode}`)
  if (p.resolution !== GRIP_RASTER_RADIAL_BASELINE.resolution) {
    issues.push(`resolution ${p.resolution} != ${GRIP_RASTER_RADIAL_BASELINE.resolution}`)
  }
  const mesh = GRIP_PLANAR_BASELINE_EXPECTATIONS
  if (p.terrainTriangles !== mesh.terrainTriangles) issues.push('terrainTriangles mismatch')
  if (p.toolTriangles !== mesh.toolTriangles) issues.push('toolTriangles mismatch')
  if (r.numStrips !== e.numStrips) issues.push(`numStrips ${r.numStrips} != ${e.numStrips}`)
  if (r.totalPoints !== e.totalPoints) issues.push(`totalPoints mismatch`)
  if (r.checksum !== e.checksum) issues.push(`checksum ${r.checksum} != ${e.checksum}`)

  return issues
}
