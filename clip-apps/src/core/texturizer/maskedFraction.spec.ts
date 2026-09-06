import { describe, expect, it } from 'vitest'
import { accumulateMaskedFraction, resolveMaskedFraction } from './maskedFraction'

describe('maskedFraction', () => {
  it('accumulates masked and total areas per key', () => {
    const map = new Map<string, [number, number]>()
    accumulateMaskedFraction(map, 'a', 2, true)
    accumulateMaskedFraction(map, 'a', 3, false)
    expect(resolveMaskedFraction(map, 'a')).toBeCloseTo(2 / 5, 8)
  })

  it('returns zero for unknown or invalid totals', () => {
    const map = new Map<string, [number, number]>()
    expect(resolveMaskedFraction(map, 'x')).toBe(0)
    map.set('x', [2, 0])
    expect(resolveMaskedFraction(map, 'x')).toBe(0)
  })

  it('clamps ratio into [0,1]', () => {
    const map = new Map<string, [number, number]>()
    map.set('a', [5, 2])
    expect(resolveMaskedFraction(map, 'a')).toBe(1)
    map.set('b', [-1, 2])
    expect(resolveMaskedFraction(map, 'b')).toBe(0)
  })
})
