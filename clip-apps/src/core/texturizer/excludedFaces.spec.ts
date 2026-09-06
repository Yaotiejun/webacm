import { describe, expect, it } from 'vitest'
import { parseExcludedFacesJson } from './excludedFaces'

describe('texturizer.excludedFaces', () => {
  it('returns empty array for empty input', () => {
    expect(parseExcludedFacesJson('')).toEqual([])
    expect(parseExcludedFacesJson('   ')).toEqual([])
  })

  it('parses, floors, filters and deduplicates indices', () => {
    expect(parseExcludedFacesJson('[1, 2.9, -1, "3", "x", 2]')).toEqual([1, 2, 3])
  })

  it('throws when json root is not an array', () => {
    expect(() => parseExcludedFacesJson('{"a":1}')).toThrow(/must be an array/)
  })
})
