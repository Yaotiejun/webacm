import { describe, expect, it } from 'vitest'
import {
  gripCompressionMiddlewareHeaders,
  shouldGripCompressResponse,
} from './gripAppServerCompression'

describe('gripAppServerCompression', () => {
  it('enables compression when Accept-Encoding lists gzip', () => {
    expect(shouldGripCompressResponse('gzip, deflate, br')).toBe(true)
    expect(shouldGripCompressResponse('identity')).toBe(false)
    expect(gripCompressionMiddlewareHeaders(true)).toEqual({ 'Content-Encoding': 'gzip' })
  })
})
