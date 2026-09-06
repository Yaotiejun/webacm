import { describe, expect, it } from 'vitest'
import { computeTriNormals } from './triNormals'

describe('computeTriNormals', () => {
  it('computes upward normal for ccw triangle', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = computeTriNormals(src)
    expect(out[0]).toBeCloseTo(0, 8)
    expect(out[1]).toBeCloseTo(0, 8)
    expect(out[2]).toBeCloseTo(1, 8)
  })

  it('computes downward normal for mirrored winding', () => {
    const src = new Float32Array([
      0, 0, 0,
      0, 1, 0,
      1, 0, 0,
    ])
    const out = computeTriNormals(src)
    expect(out[2]).toBeCloseTo(-1, 8)
  })

  it('returns zero normal for degenerate triangle', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      2, 0, 0,
    ])
    const out = computeTriNormals(src)
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(0)
    expect(out[2]).toBe(0)
  })
})
