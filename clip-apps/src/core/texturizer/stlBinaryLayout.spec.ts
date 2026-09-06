import { describe, expect, it } from 'vitest'
import {
  BINARY_STL_HEADER_BYTES,
  BINARY_STL_TRIANGLE_RECORD_BYTES,
  TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH,
  binaryStlByteLength,
} from './stlBinaryLayout'

describe('stlBinaryLayout', () => {
  it('matches standard binary STL size formula', () => {
    expect(BINARY_STL_HEADER_BYTES).toBe(80)
    expect(BINARY_STL_TRIANGLE_RECORD_BYTES).toBe(50)
    expect(binaryStlByteLength(0)).toBe(84)
    expect(binaryStlByteLength(100)).toBe(80 + 4 + 100 * 50)
  })

  it('pins one-triangle export size', () => {
    expect(TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH).toBe(134)
  })
})
