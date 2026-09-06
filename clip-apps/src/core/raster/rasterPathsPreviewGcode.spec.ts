import { describe, expect, it } from 'vitest'
import { buildGcodePathPositions } from '@/core/gcode/gcodePathPreview'
import { buildRasterPathsPreviewSyntheticGcode } from './rasterPathsPreviewGcode'

describe('rasterPathsPreviewGcode', () => {
  it('returns empty string when no paths', () => {
    expect(buildRasterPathsPreviewSyntheticGcode({ paths: [] })).toBe('')
  })

  it('emits motion lines that yield a polyline for gcodePathPreview', () => {
    const g = buildRasterPathsPreviewSyntheticGcode({
      paths: [
        { points: [[0, 0, 0], [10, 0, 1], [10, 10, 2]] },
        { points: [[1, 1, 0.5], [5, 5, 1.5]] },
      ],
    })
    expect(g).toContain('G21')
    expect(g).toContain('G0 X0.0000')
    const built = buildGcodePathPositions(g)
    expect(built.vertexCount).toBeGreaterThanOrEqual(2)
  })
})
