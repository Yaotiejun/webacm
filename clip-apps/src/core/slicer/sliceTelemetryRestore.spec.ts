import { describe, expect, it } from 'vitest'
import { normalizeSliceTelemetryTimelineEntries } from './sliceTelemetryRestore'

describe('slicer.sliceTelemetryRestore', () => {
  it('normalizes, sorts by ts desc, and caps entries', () => {
    const out = normalizeSliceTelemetryTimelineEntries(
      [
        {
          kind: 'slicer_fallback',
          code: 'slicer_a',
          reasonCode: 'legacy_slice_failed',
          message: 'a',
          ts: 10,
        },
        {
          kind: 'slicer_fallback',
          code: 'slicer_b',
          reasonCode: 'legacy_slice_failed',
          message: 'b',
          ts: 20,
        },
        {
          kind: 'slicer_fallback',
          code: 'slicer_c',
          reasonCode: 'legacy_slice_failed',
          message: 'c',
          ts: 15,
        },
      ],
      2,
    )
    expect(out.length).toBe(2)
    expect(out[0]?.code).toBe('slicer_b')
    expect(out[1]?.code).toBe('slicer_c')
  })
})
