import { describe, expect, it } from 'vitest'
import { buildGcodePathPositions } from './gcodePathPreview'
import { buildSyntheticPreviewGcode } from './syntheticPreviewGcode'

describe('syntheticPreviewGcode', () => {
  it('returns empty when no groups', () => {
    expect(
      buildSyntheticPreviewGcode({
        headerComment: 'test',
        groups: [],
      }),
    ).toBe('')
  })

  it('uses xyz first move by default', () => {
    const g = buildSyntheticPreviewGcode({
      headerComment: 'test',
      groups: [{ points: [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }] }],
    })
    expect(g).toContain('G0 X1.0000 Y2.0000 Z3.0000')
    expect(g).toContain('G1 X4.0000 Y5.0000 Z6.0000')
  })

  it('supports z-then-xy first move', () => {
    const g = buildSyntheticPreviewGcode({
      headerComment: 'test',
      groups: [{ points: [{ x: 0, y: 0, z: 0.2 }, { x: 1, y: 0, z: 0.2 }] }],
      firstMove: 'z-then-xy',
    })
    expect(g).toContain('G0 Z0.2000')
    expect(g).toContain('G0 X0.0000 Y0.0000')
    const built = buildGcodePathPositions(g)
    expect(built.vertexCount).toBeGreaterThanOrEqual(2)
  })
})
