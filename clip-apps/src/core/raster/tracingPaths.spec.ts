import { describe, expect, it } from 'vitest'
import { parseTracingPathsJson, TracingPathsParseError } from './tracingPaths'

describe('raster.tracingPaths', () => {
  it('parses valid tracing paths json', () => {
    const paths = parseTracingPathsJson('[{"points":[[0,0],[1.5,2]]}]')
    expect(paths.length).toBe(1)
    expect(paths[0]?.points[1]).toEqual([1.5, 2])
  })

  it('returns empty array for empty input', () => {
    expect(parseTracingPathsJson('   ')).toEqual([])
  })

  it('throws on invalid points shape', () => {
    expect(() => parseTracingPathsJson('[{"points":[[0]]}]')).toThrow(/必须是 \[x, y\]/)
  })

  it('throws structured parse error with code', () => {
    try {
      parseTracingPathsJson('{"a":1}')
      throw new Error('should not reach')
    } catch (err) {
      expect(err).toBeInstanceOf(TracingPathsParseError)
      expect((err as TracingPathsParseError).code).toBe('root_not_array')
    }
  })
})
