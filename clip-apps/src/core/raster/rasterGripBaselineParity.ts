import type { RasterMode, RasterResult } from '@/types/raster'
import {
  GRIP_PLANAR_BASELINE_EXPECTATIONS,
  GRIP_RADIAL_BASELINE_EXPECTATIONS,
} from '@/core/raster/rasterGripBaselineExpectations'
import { gripPlanarPathsChecksum, gripRadialPathsChecksum } from '@/core/raster/rasterGripPathChecksum'

/** grip `planar-baseline.json` mesh sizes (triangle vertex count). */
export const GRIP_BASELINE_TERRAIN_VERTICES = GRIP_PLANAR_BASELINE_EXPECTATIONS.terrainTriangles
export const GRIP_BASELINE_TOOL_VERTICES = GRIP_PLANAR_BASELINE_EXPECTATIONS.toolTriangles

export function matchesGripBaselineMesh(terrainVertexCount: number, toolVertexCount: number): boolean {
  return terrainVertexCount === GRIP_BASELINE_TERRAIN_VERTICES && toolVertexCount === GRIP_BASELINE_TOOL_VERTICES
}

export type GripBaselineParityReport = {
  mode: RasterMode
  meshMatch: boolean
  checksum: number
  expectedChecksum: number
  checksumMatch: boolean
  pathCount: number
  pointCount: number
  expectedPathCount?: number
  expectedPointCount?: number
  engine?: string
  gripBridge?: boolean
}

export function buildGripBaselineParityReport(
  result: RasterResult,
  mode: RasterMode,
  terrainVertexCount: number,
  toolVertexCount: number,
): GripBaselineParityReport {
  const meshMatch = matchesGripBaselineMesh(terrainVertexCount, toolVertexCount)
  const checksum =
    mode === 'radial' ? gripRadialPathsChecksum(result.paths) : gripPlanarPathsChecksum(result.paths)
  const expectedChecksum =
    mode === 'radial'
      ? GRIP_RADIAL_BASELINE_EXPECTATIONS.checksum
      : GRIP_PLANAR_BASELINE_EXPECTATIONS.checksum
  const expectedPointCount =
    mode === 'radial'
      ? GRIP_RADIAL_BASELINE_EXPECTATIONS.totalPoints
      : GRIP_PLANAR_BASELINE_EXPECTATIONS.toolpathSize

  return {
    mode,
    meshMatch,
    checksum,
    expectedChecksum,
    checksumMatch: checksum === expectedChecksum,
    pathCount: result.summary.pathCount,
    pointCount: result.summary.pointCount,
    expectedPathCount:
      mode === 'planar' ? GRIP_PLANAR_BASELINE_EXPECTATIONS.numScanlines : GRIP_RADIAL_BASELINE_EXPECTATIONS.numStrips,
    expectedPointCount,
    engine: result.summary.engine,
    gripBridge: result.summary.gripBridge,
  }
}

export function formatGripBaselineParityReport(r: GripBaselineParityReport): string {
  const lines = [
    `mode=${r.mode} meshMatch=${r.meshMatch ? 'Y' : 'N'} engine=${r.engine ?? '?'} gripBridge=${r.gripBridge ? 'Y' : 'N'}`,
    `checksum=${r.checksum} expected=${r.expectedChecksum} ${r.checksumMatch ? 'OK' : 'MISMATCH'}`,
    `paths=${r.pathCount} (expect ~${r.expectedPathCount ?? '?'}) points=${r.pointCount} (expect ~${r.expectedPointCount ?? '?'})`,
  ]
  if (!r.meshMatch) {
    lines.push(
      `hint: load grip baseline STL pair (terrain ${GRIP_BASELINE_TERRAIN_VERTICES} / tool ${GRIP_BASELINE_TOOL_VERTICES} verts)`,
    )
  }
  if (!r.checksumMatch && r.meshMatch) {
    lines.push('hint: try VITE_RASTER_GRIP_BRIDGE=1 or enable “grip 桥接” for raster-path-main parity')
  }
  return lines.join('\n')
}
