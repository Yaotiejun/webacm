import type { SliceResult } from '@/api/slice'
import { buildSyntheticPreviewGcode } from '@/core/gcode/syntheticPreviewGcode'

/**
 * Build a minimal G-code string from `SliceResult.preview` 2D paths so
 * `buildGcodePathPositions` / `useGcodeThreeViewport` can show a rough spatial polyline.
 * Not intended for machine execution.
 */
export function buildFdmSlicePreviewSyntheticGcode(
  result: SliceResult,
  opts?: { maxLayers?: number; maxPoints?: number },
): string {
  const layers = result.preview?.layers
  if (!layers?.length) return ''

  const maxLayers = Math.max(1, opts?.maxLayers ?? 16)
  const maxPoints = Math.max(4, opts?.maxPoints ?? 8000)

  const groups = []
  for (let li = 0; li < layers.length && li < maxLayers; li += 1) {
    const layer = layers[li]!
    const z = Number.isFinite(layer.z) ? layer.z : 0
    const points: { x: number; y: number; z: number }[] = []
    for (const path of layer.paths) {
      for (const pt of path.points) {
        const x = pt[0] ?? 0
        const y = pt[1] ?? 0
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        points.push({ x, y, z })
      }
    }
    groups.push({ comment: `L${li} z=${z.toFixed(4)}`, points })
  }

  return buildSyntheticPreviewGcode({
    headerComment: 'synth preview from sliceResult.preview (not for printing)',
    groups,
    maxGroups: maxLayers,
    maxPoints,
    firstMove: 'z-then-xy',
  })
}
