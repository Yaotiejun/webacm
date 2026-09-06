import { describe, expect, it } from 'vitest'
import { buildSliceTelemetryDigest } from './sliceTelemetryDigest'

describe('slicer.sliceTelemetryDigest', () => {
  it('returns newest-first capped telemetry digest', () => {
    const digest = buildSliceTelemetryDigest(
      [
        {
          kind: 'slicer_fallback',
          code: 'slicer_legacy_slice_timeout',
          reasonCode: 'legacy_slice_timeout',
          message: 'timeout',
          ts: 3,
        },
        {
          kind: 'slicer_fallback',
          code: 'slicer_legacy_slice_failed',
          reasonCode: 'legacy_slice_failed',
          message: 'failed',
          ts: 2,
        },
      ],
      1,
    )
    expect(digest.length).toBe(1)
    expect(digest[0]?.code).toBe('slicer_legacy_slice_timeout')
    expect(digest[0]?.ts).toBe(3)
  })

  it('returns empty digest for invalid or empty timeline', () => {
    expect(buildSliceTelemetryDigest([], 5)).toEqual([])
    expect(buildSliceTelemetryDigest([])).toEqual([])
  })
})
