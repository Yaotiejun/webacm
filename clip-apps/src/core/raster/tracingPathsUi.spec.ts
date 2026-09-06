import { describe, expect, it } from 'vitest'
import { getTracingPathsParseErrorLabel } from './tracingPathsUi'
import { TracingPathsParseError } from './tracingPaths'

describe('raster.tracingPathsUi', () => {
  it('maps structured parse error code to Chinese label', () => {
    const label = getTracingPathsParseErrorLabel(new TracingPathsParseError('point_not_xy', 'raw'))
    expect(label).toBe('points 中每个点必须是 [x, y] 数字坐标')
  })

  it('falls back to generic Error message', () => {
    const label = getTracingPathsParseErrorLabel(new Error('boom'))
    expect(label).toBe('boom')
  })
})
