import { describe, expect, it } from 'vitest'
import type { SliceResult } from '@/api/slice'
import { buildGcodePathPositions } from '@/core/gcode/gcodePathPreview'
import { buildFdmSlicePreviewSyntheticGcode } from './fdmSlicePreviewGcode'

function makeSlice(): SliceResult {
  return {
    summary: { layers: 2, timeMinutes: 1, filamentMm: 10 },
    preview: {
      bounds: { minX: 0, minY: 0, maxX: 20, maxY: 20 },
      layers: [
        {
          z: 0.2,
          paths: [
            { type: 'perimeter', points: [ [0, 0], [10, 0], [10, 10] ] },
            { type: 'infill', points: [ [1, 1], [9, 1] ] },
          ],
        },
        {
          z: 0.4,
          paths: [{ type: 'perimeter', points: [ [2, 2], [8, 2] ] }],
        },
      ],
    },
  }
}

describe('fdmSlicePreviewGcode', () => {
  it('returns empty string when no layers', () => {
    const r: SliceResult = {
      summary: { layers: 0, timeMinutes: 0, filamentMm: 0 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
    }
    expect(buildFdmSlicePreviewSyntheticGcode(r)).toBe('')
  })

  it('emits motion lines that yield a polyline for gcodePathPreview', () => {
    const g = buildFdmSlicePreviewSyntheticGcode(makeSlice(), { maxLayers: 4, maxPoints: 100 })
    expect(g).toContain('G21')
    expect(g).toContain('G0 Z0.2000')
    const built = buildGcodePathPositions(g)
    expect(built.vertexCount).toBeGreaterThanOrEqual(2)
  })
})
