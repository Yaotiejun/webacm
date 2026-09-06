import { describe, expect, it } from 'vitest'
import { accumulateWeightedGray, resolveCachedGray } from './displacementSampling'

describe('resolveCachedGray', () => {
  it('computes once then reuses cache', () => {
    const cache = new Map<string, number>()
    let calls = 0
    const a = resolveCachedGray(cache, 'k', () => {
      calls += 1
      return 0.42
    })
    const b = resolveCachedGray(cache, 'k', () => {
      calls += 1
      return 0.99
    })
    expect(a).toBeCloseTo(0.42, 8)
    expect(b).toBeCloseTo(0.42, 8)
    expect(calls).toBe(1)
  })
})

describe('accumulateWeightedGray', () => {
  it('sums weighted samples and skips invalid entries', () => {
    const out = accumulateWeightedGray(
      [
        { u: 0, v: 0, w: 0.25 },
        { u: 1, v: 1, w: 0.75 },
        { u: 2, v: 2, w: Number.NaN },
      ],
      (u, v) => u + v,
    )
    expect(out).toBeCloseTo((0 + 0) * 0.25 + (1 + 1) * 0.75, 8)
  })
})
