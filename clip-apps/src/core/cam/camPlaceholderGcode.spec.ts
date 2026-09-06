import { describe, expect, it } from 'vitest'
import { buildCamPlaceholderGcode } from './camPlaceholderGcode'

describe('buildCamPlaceholderGcode', () => {
  it('emits a closed XY rectangle at top Z', () => {
    const g = buildCamPlaceholderGcode(
      {
        id: 'b',
        bbox: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 5, maxZ: 2 },
      },
      'test',
    )
    expect(g).toContain('G21')
    expect(g).toContain('G1 X10')
    expect(g).toContain('Z2')
  })
})
