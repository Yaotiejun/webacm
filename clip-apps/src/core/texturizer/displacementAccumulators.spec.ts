import { describe, expect, it } from 'vitest'
import { accumulateTuple, accumulateVec3Weighted, normalizeVec3Map } from './displacementAccumulators'

describe('displacementAccumulators', () => {
  it('accumulates weighted vec3 values', () => {
    const map = new Map<string, [number, number, number]>()
    accumulateVec3Weighted(map, 'k', 1, 2, 3, 2)
    accumulateVec3Weighted(map, 'k', 2, 0, 1, 1)
    expect(map.get('k')).toEqual([4, 4, 7])
  })

  it('accumulates raw tuple values', () => {
    const map = new Map<string, [number, number, number]>()
    accumulateTuple(map, 'z', 1, 0, 0)
    accumulateTuple(map, 'z', 0.5, 1, 2)
    expect(map.get('z')).toEqual([1.5, 1, 2])
  })

  it('normalizes each vector in map', () => {
    const map = new Map<string, [number, number, number]>()
    map.set('a', [3, 0, 4])
    normalizeVec3Map(map)
    const v = map.get('a') ?? [0, 0, 0]
    expect(v[0]).toBeCloseTo(0.6, 8)
    expect(v[2]).toBeCloseTo(0.8, 8)
  })
})
