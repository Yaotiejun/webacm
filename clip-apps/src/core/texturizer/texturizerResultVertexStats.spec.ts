import { describe, expect, it } from 'vitest'
import { texturizerVertexZStats } from './texturizerResultVertexStats'

describe('texturizerVertexZStats', () => {
  it('computes z range and delta', () => {
    const orig = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const out = new Float32Array([0, 0, -0.1, 1, 0, 0.2, 0, 1, 0.3])
    const s = texturizerVertexZStats(out, orig)
    expect(s.minDeltaZ).toBeCloseTo(-0.1, 6)
    expect(s.maxDeltaZ).toBeCloseTo(0.3, 6)
  })
})
