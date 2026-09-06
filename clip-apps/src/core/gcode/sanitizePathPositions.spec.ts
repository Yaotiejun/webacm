import { describe, expect, it } from 'vitest'
import { filterFinitePathPositions3, isRenderablePathPositions3 } from './sanitizePathPositions'

describe('sanitizePathPositions', () => {
  it('drops non-finite triples', () => {
    const src = new Float32Array([0, 0, 0, NaN, 1, 2, 3, 4, 5])
    expect(Array.from(filterFinitePathPositions3(src))).toEqual([0, 0, 0, 3, 4, 5])
  })

  it('isRenderable requires at least two vertices', () => {
    expect(isRenderablePathPositions3(new Float32Array([0, 0, 0]))).toBe(false)
    expect(isRenderablePathPositions3(new Float32Array([0, 0, 0, 1, 1, 1]))).toBe(true)
  })
})
