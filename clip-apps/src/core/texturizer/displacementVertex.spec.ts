import { describe, expect, it } from 'vitest'
import { resolveVertexDisplacement } from './displacementVertex'

describe('resolveVertexDisplacement', () => {
  it('uses symmetric centered gray to derive base displacement', () => {
    const out = resolveVertexDisplacement({
      z: 2,
      grey01: 0.8,
      amplitude: 10,
      symmetricDisplacement: true,
      maskedFrac: 0,
      isFaceExcluded: false,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 0,
    })
    expect(out.centeredGrey).toBeCloseTo(0.3, 8)
    expect(out.baseDz).toBeCloseTo(3, 8)
    expect(out.nz).toBeCloseTo(5, 8)
  })

  it('pins excluded/sealed vertices regardless of computed baseDz', () => {
    const out = resolveVertexDisplacement({
      z: 4,
      grey01: 1,
      amplitude: 3,
      symmetricDisplacement: false,
      maskedFrac: 0,
      isFaceExcluded: true,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 0,
    })
    expect(out.baseDz).toBeCloseTo(3, 8)
    expect(out.dz).toBe(0)
    expect(out.nz).toBe(4)
  })

  it('applies masked limit clamping via displacement rules', () => {
    const out = resolveVertexDisplacement({
      z: 5,
      grey01: 1,
      amplitude: 2,
      symmetricDisplacement: false,
      maskedFrac: 0.6,
      isFaceExcluded: false,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 5,
    })
    expect(out.dz).toBeCloseTo(0.8, 8)
    expect(out.nz).toBe(5)
  })
})
