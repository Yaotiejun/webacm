import { describe, expect, it } from 'vitest'
import { toTexturizerOverallProgress } from './texturizerOverallProgress'

describe('toTexturizerOverallProgress', () => {
  it('returns 0 at subdivision start and 1 at finalize end', () => {
    expect(toTexturizerOverallProgress('subdivision', 0)).toBe(0)
    expect(toTexturizerOverallProgress('finalize', 1)).toBeCloseTo(1, 5)
  })

  it('monotonically increases through stages at mid progress', () => {
    const a = toTexturizerOverallProgress('subdivision', 0.5)
    const b = toTexturizerOverallProgress('displacement', 0.5)
    const c = toTexturizerOverallProgress('decimation', 0.5)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })
})
