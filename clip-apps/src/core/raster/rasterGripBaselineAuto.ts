import type { RasterMode, RasterResult } from '@/types/raster'
import {
  buildGripBaselineParityReport,
  formatGripBaselineParityReport,
  matchesGripBaselineMesh,
} from '@/core/raster/rasterGripBaselineParity'

export type GripBaselineParityBundle = {
  report: ReturnType<typeof buildGripBaselineParityReport>
  text: string
}

/** When mesh matches grip baseline STL counts, build parity report + formatted text. */
export function tryGripBaselineParityBundle(
  result: RasterResult,
  mode: RasterMode,
  terrainVertexCount: number,
  toolVertexCount: number,
): GripBaselineParityBundle | null {
  if (!matchesGripBaselineMesh(terrainVertexCount, toolVertexCount)) return null
  const report = buildGripBaselineParityReport(result, mode, terrainVertexCount, toolVertexCount)
  return {
    report,
    text: `[auto grip baseline]\n${formatGripBaselineParityReport(report)}`,
  }
}

/** When mesh matches grip baseline STL counts, return a parity report string for the compare panel. */
export function tryFormatAutoGripBaselineParity(
  result: RasterResult,
  mode: RasterMode,
  terrainVertexCount: number,
  toolVertexCount: number,
): string | null {
  return tryGripBaselineParityBundle(result, mode, terrainVertexCount, toolVertexCount)?.text ?? null
}
