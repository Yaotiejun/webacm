import { describe, expect, it } from 'vitest'
import { sampleMappedGray } from './mappedGraySampling'

describe('sampleMappedGray', () => {
  it('samples plain uv when payload is non-triplanar', () => {
    const out = sampleMappedGray({ u: 2, v: 3 }, 0.5, (u, v) => u * 10 + v)
    expect(out).toBeCloseTo(11.5, 8)
  })

  it('uses normalized weighted average for triplanar samples', () => {
    const out = sampleMappedGray(
      {
        triplanar: true,
        samples: [
          { u: 1, v: 0, w: 2 },
          { u: 0, v: 1, w: 1 },
        ],
      },
      1,
      (u, v) => u + 10 * v,
    )
    expect(out).toBeCloseTo((2 * 1 + 1 * 10) / 3, 8)
  })

  it('falls back to first triplanar sample when total weight is zero', () => {
    const out = sampleMappedGray(
      {
        triplanar: true,
        samples: [
          { u: 2, v: 3, w: 0 },
          { u: 4, v: 5, w: -1 },
        ],
      },
      2,
      (u, v) => u + v,
    )
    expect(out).toBeCloseTo((2 * 2) + (3 * 2), 8)
  })
})
