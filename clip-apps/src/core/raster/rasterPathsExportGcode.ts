import type { RasterResult } from '@/types/raster'
import { buildRasterPathsPreviewSyntheticGcode } from '@/core/raster/rasterPathsPreviewGcode'

/**
 * Export-oriented G-code from raster paths (still synthetic G0/G1 — not grip raster-path-main export format).
 */
export function buildRasterPathsExportGcode(result: Pick<RasterResult, 'paths'>): string {
  return buildRasterPathsPreviewSyntheticGcode(result, {
    maxPaths: 5000,
    maxPoints: 500_000,
  })
}
