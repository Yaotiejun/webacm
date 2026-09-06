import { describe, expect, it } from 'vitest'
import { stableJsonEqual, toStableJsonText, toStableJsonValue } from './stableJson'

describe('core.stableJson', () => {
  it('stableJsonEqual ignores object key insertion order', () => {
    expect(stableJsonEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true)
  })

  it('stableJsonEqual distinguishes values', () => {
    expect(stableJsonEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('stableJsonEqual respects array order', () => {
    expect(stableJsonEqual([1, 2], [2, 1])).toBe(false)
  })

  it('toStableJsonText is deterministic for nested objects', () => {
    const a = toStableJsonText({ z: { y: 2, x: 1 }, w: 0 })
    const b = toStableJsonText({ w: 0, z: { x: 1, y: 2 } })
    expect(a).toBe(b)
  })

  it('toStableJsonValue maps undefined fields to null for stable object shape', () => {
    const v = toStableJsonValue({ a: undefined, b: 1 })
    expect(v).toEqual({ a: null, b: 1 })
  })
})
