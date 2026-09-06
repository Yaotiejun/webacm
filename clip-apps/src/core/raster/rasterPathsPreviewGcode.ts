import type { RasterResult } from '@/types/raster'
import { buildSyntheticPreviewGcode } from '@/core/gcode/syntheticPreviewGcode'

/**
 * Build a minimal G-code string from `RasterResult.paths` ([x,y,z] points)
 * for `buildGcodePathPositions` / `useGcodeThreeViewport`. Not for machining.
 */
export function buildRasterPathsPreviewSyntheticGcode(
  result: Pick<RasterResult, 'paths'>,
  opts?: { maxPaths?: number; maxPoints?: number },
): string {
  const paths = result.paths
  if (!paths?.length) return ''

  const maxPaths = Math.max(1, opts?.maxPaths ?? 200)
  const groups = paths.slice(0, maxPaths).map((path, pi) => ({
    comment: `path ${pi} pts=${path.points.length}`,
    points: path.points.map((pt) => ({
      x: pt[0] ?? 0,
      y: pt[1] ?? 0,
      z: pt[2] ?? 0,
    })),
  }))

  return buildSyntheticPreviewGcode({
    headerComment: 'synth preview from rasterResult.paths (not for machining)',
    groups,
    maxGroups: maxPaths,
    maxPoints: opts?.maxPoints ?? 12000,
    firstMove: 'xyz',
  })
}
