import { describe, expect, it } from 'vitest'
import { gripNetLevelSafeParse } from './gripNetLevelSafeParse'

describe('gripNetLevelSafeParse', () => {
  it('parses JSON and primitives without eval', () => {
    expect(gripNetLevelSafeParse('{"a":1}')).toEqual({ a: 1 })
    expect(gripNetLevelSafeParse('[1,2]')).toEqual([1, 2])
    expect(gripNetLevelSafeParse('42')).toBe(42)
    expect(gripNetLevelSafeParse('hello')).toBe('hello')
  })
})
