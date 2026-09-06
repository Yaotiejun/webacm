import { describe, expect, it } from 'vitest'
import { resolveDisplacementRule } from './displacementRules'

describe('resolveDisplacementRule', () => {
  it('pins displacement for excluded or sealed vertices', () => {
    const ex = resolveDisplacementRule({
      z: 10,
      baseDz: 2,
      maskedFrac: 0,
      isFaceExcluded: true,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 0,
    })
    expect(ex.dz).toBe(0)
    expect(ex.nz).toBe(10)
  })

  it('applies masked fraction attenuation on normal vertices', () => {
    const out = resolveDisplacementRule({
      z: 0,
      baseDz: 1,
      maskedFrac: 0.25,
      isFaceExcluded: false,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 0,
    })
    expect(out.dz).toBeCloseTo(0.75, 8)
    expect(out.nz).toBeCloseTo(0.75, 8)
  })

  it('clamps negative z push when bottom limit active and partially masked', () => {
    const out = resolveDisplacementRule({
      z: 5,
      baseDz: -2,
      maskedFrac: 0.4,
      isFaceExcluded: false,
      isSealedBoundary: false,
      bottomAngleLimit: 5,
      topAngleLimit: 0,
    })
    expect(out.nz).toBe(5)
  })

  it('clamps positive z push when top limit active and partially masked', () => {
    const out = resolveDisplacementRule({
      z: 5,
      baseDz: 2,
      maskedFrac: 0.4,
      isFaceExcluded: false,
      isSealedBoundary: false,
      bottomAngleLimit: 0,
      topAngleLimit: 5,
    })
    expect(out.nz).toBe(5)
  })
})
