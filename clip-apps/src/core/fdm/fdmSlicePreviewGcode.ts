import type { SliceResult } from '@/api/slice'
import { buildSyntheticPreviewGcode } from '@/core/gcode/syntheticPreviewGcode'

/**
 * Build a minimal G-code string from `SliceResult.preview` 2D paths so
 * `buildGcodePathPositions` / `useGcodeThreeViewport` can show a rough spatial polyline.
 * Not intended for machine execution.
 *
 * Each slice path becomes its own group so the synthesizer emits G0 between features
 * (avoids fake travels stitching shells/infill together).
 */
export function buildFdmSlicePreviewSyntheticGcode(
  result: SliceResult,
  opts?: { maxLayers?: number; maxPoints?: number },
): string {
  const layers = result.preview?.layers
  if (!layers?.length) return ''

  // Prefer showing all layers (Kiri stack); keep a high cap for huge jobs.
  const maxLayers = Math.max(1, opts?.maxLayers ?? 500)
  const maxPoints = Math.max(4, opts?.maxPoints ?? 20_000)

  const groups = []
  for (let li = 0; li < layers.length && li < maxLayers; li += 1) {
    const layer = layers[li]!
    const z = Number.isFinite(layer.z) ? layer.z : 0
    for (let pi = 0; pi < layer.paths.length; pi += 1) {
      const path = layer.paths[pi]!
      if (path.type === 'travel') continue
      const points: { x: number; y: number; z: number }[] = []
      for (const pt of path.points) {
        const x = pt[0] ?? 0
        const y = pt[1] ?? 0
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        points.push({ x, y, z })
      }
      if (points.length < 2) continue
      groups.push({ comment: `L${li} ${path.type} z=${z.toFixed(4)}`, points })
    }
  }

  return buildSyntheticPreviewGcode({
    headerComment: 'synth preview from sliceResult.preview (Kiri-aligned paths; not for printing)',
    groups,
    maxGroups: groups.length,
    maxPoints,
    firstMove: 'z-then-xy',
  })
}
