import { describe, expect, it } from 'vitest'
import { buildGcodePathHint } from './gcodePathHint'

describe('buildGcodePathHint', () => {
  it('returns empty for empty scan', () => {
    expect(
      buildGcodePathHint({
        positions: new Float32Array(0),
        segments: [],
        endPosition: { x: 0, y: 0, z: 0 },
        rapidVertexCount: 0,
        cutVertexCount: 0,
        tessellatedArcs: 0,
        skippedArcs: 0,
        linesScanned: 0,
        vertexCount: 0,
      }),
    ).toBe('')
  })

  it('reports skipped arcs when no vertices', () => {
    expect(
      buildGcodePathHint({
        positions: new Float32Array(0),
        segments: [],
        endPosition: { x: 0, y: 0, z: 0 },
        rapidVertexCount: 0,
        cutVertexCount: 0,
        tessellatedArcs: 0,
        skippedArcs: 2,
        linesScanned: 5,
        vertexCount: 0,
      }),
    ).toContain('未解析圆弧 2')
  })
})
