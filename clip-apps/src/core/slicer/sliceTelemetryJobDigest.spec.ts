import { describe, expect, it } from 'vitest'
import { buildSliceTelemetryDigestForJob } from './sliceTelemetryJobDigest'
import {
  resetSliceTelemetryDigestMaxEntriesOverride,
  setSliceTelemetryDigestMaxEntriesOverride,
} from './sliceTelemetryConfig'

describe('slicer.sliceTelemetryJobDigest', () => {
  it('uses configured digest max entries', () => {
    setSliceTelemetryDigestMaxEntriesOverride(2)
    try {
      const out = buildSliceTelemetryDigestForJob([
        {
          kind: 'slicer_fallback',
          code: 'slicer_a',
          reasonCode: 'legacy_slice_failed',
          message: 'a',
          ts: 3,
        },
        {
          kind: 'slicer_fallback',
          code: 'slicer_b',
          reasonCode: 'legacy_slice_failed',
          message: 'b',
          ts: 2,
        },
        {
          kind: 'slicer_fallback',
          code: 'slicer_c',
          reasonCode: 'legacy_slice_failed',
          message: 'c',
          ts: 1,
        },
      ])
      expect(out.length).toBe(2)
      expect(out[0]?.code).toBe('slicer_a')
      expect(out[1]?.code).toBe('slicer_b')
    } finally {
      resetSliceTelemetryDigestMaxEntriesOverride()
    }
  })
})
