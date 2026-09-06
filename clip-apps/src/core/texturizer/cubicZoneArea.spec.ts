import { describe, expect, it } from 'vitest'
import { resolveCubicZoneAreaContribution } from './cubicZoneArea'

describe('resolveCubicZoneAreaContribution', () => {
  it('returns zeros for non-cubic mode', () => {
    const out = resolveCubicZoneAreaContribution(0, { x: 1, y: 0, z: 0 }, 1, 2, 0.5, 0.35)
    expect(out).toEqual([0, 0, 0])
  })

  it('returns one-hot scaled area when blend is zero', () => {
    const out = resolveCubicZoneAreaContribution(6, { x: 0, y: 0, z: 2 }, 2, 3, 0, 0.35)
    expect(out[2]).toBeCloseTo(3, 8)
    expect(out[0]).toBeCloseTo(0, 8)
    expect(out[1]).toBeCloseTo(0, 8)
  })

  it('area contributions sum to face area', () => {
    const out = resolveCubicZoneAreaContribution(6, { x: 1, y: 1, z: 1 }, Math.sqrt(3), 4, 1, 0.35)
    expect(out[0] + out[1] + out[2]).toBeCloseTo(4, 8)
  })
})
