import { describe, expect, it } from 'vitest'
import { camProcessFieldsEqual } from './camProcessFieldsEqual'

describe('cam.camProcessFieldsEqual', () => {
  it('uses 1e-9 tolerance for numbers', () => {
    expect(camProcessFieldsEqual(0.1 + 0.2, 0.3)).toBe(true)
    expect(camProcessFieldsEqual(0, 1e-8)).toBe(false)
  })

  it('matches stableJsonEqual for nested key order', () => {
    expect(camProcessFieldsEqual({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true)
  })

  it('treats null as equal only to null', () => {
    expect(camProcessFieldsEqual(null, null)).toBe(true)
    expect(camProcessFieldsEqual(null, undefined)).toBe(false)
  })

  it('compares booleans strictly', () => {
    expect(camProcessFieldsEqual(false, false)).toBe(true)
    expect(camProcessFieldsEqual(false, true)).toBe(false)
  })

  it('compares string primitives', () => {
    expect(camProcessFieldsEqual('same', 'same')).toBe(true)
    expect(camProcessFieldsEqual('a', 'b')).toBe(false)
  })

  it('uses stableJsonEqual for arrays', () => {
    expect(camProcessFieldsEqual([1, 2], [1, 2])).toBe(true)
    expect(camProcessFieldsEqual([1, 2], [2, 1])).toBe(false)
  })
})
