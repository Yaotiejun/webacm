import { describe, expect, it } from 'vitest'
import { clonePlain } from './clonePlain'

describe('core.clonePlain', () => {
  it('deep clones plain objects so nested mutations do not leak', () => {
    const src = { a: 1, nested: { b: 2 } }
    const copy = clonePlain(src)
    expect(copy).toEqual(src)
    expect(copy).not.toBe(src)
    ;(copy as { nested: { b: number } }).nested.b = 9
    expect(src.nested.b).toBe(2)
  })

  it('clones arrays with nested elements', () => {
    const src = [{ x: 1 }]
    const copy = clonePlain(src)
    expect(copy).toEqual(src)
    copy[0].x = 99
    expect(src[0].x).toBe(1)
  })
})
