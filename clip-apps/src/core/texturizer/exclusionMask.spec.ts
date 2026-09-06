import { describe, expect, it } from 'vitest'
import { buildUserExcludedTriMask, ensureUserExcludedTriMaskLength } from './exclusionMask'

describe('buildUserExcludedTriMask', () => {
  it('marks provided indices in exclude mode', () => {
    const out = buildUserExcludedTriMask(5, [1, 3], 'exclude')
    expect(Array.from(out)).toEqual([0, 1, 0, 1, 0])
  })

  it('inverts selection in include mode', () => {
    const out = buildUserExcludedTriMask(5, [1, 3], 'include')
    expect(Array.from(out)).toEqual([1, 0, 1, 0, 1])
  })

  it('normalizes and filters invalid indices', () => {
    const out = buildUserExcludedTriMask(4, [1.9, -1, 99, Number.NaN], 'exclude')
    expect(Array.from(out)).toEqual([0, 1, 0, 0])
  })

  it('rebuilds mask only when tri count mismatches', () => {
    const current = new Uint8Array([1, 0])
    const same = ensureUserExcludedTriMaskLength({
      triCount: 2,
      currentMask: current,
      excludedFaces: [1],
      exclusionMode: 'exclude',
    })
    expect(same).toBe(current)
    const rebuilt = ensureUserExcludedTriMaskLength({
      triCount: 3,
      currentMask: current,
      excludedFaces: [1],
      exclusionMode: 'exclude',
    })
    expect(Array.from(rebuilt)).toEqual([0, 1, 0])
  })
})
