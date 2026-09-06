import { describe, expect, it } from 'vitest'
import { pushSliceTelemetryTimelineEntry } from './sliceTelemetryTimeline'

describe('slicer.sliceTelemetryTimeline', () => {
  it('prepends telemetry event with timestamp', () => {
    const out = pushSliceTelemetryTimelineEntry(
      [],
      {
        kind: 'slicer_fallback',
        code: 'slicer_legacy_slice_timeout',
        reasonCode: 'legacy_slice_timeout',
        message: 'timeout',
      },
      { now: 123, maxEntries: 20 },
    )
    expect(out.length).toBe(1)
    expect(out[0]?.ts).toBe(123)
    expect(out[0]?.code).toBe('slicer_legacy_slice_timeout')
  })

  it('caps timeline size while keeping newest-first order', () => {
    let timeline: any[] = []
    for (let i = 0; i < 4; i += 1) {
      timeline = pushSliceTelemetryTimelineEntry(
        timeline,
        {
          kind: 'slicer_fallback',
          code: `slicer_${i}`,
          reasonCode: 'legacy_slice_failed',
          message: `m${i}`,
        },
        { now: i, maxEntries: 2 },
      )
    }
    expect(timeline.length).toBe(2)
    expect(timeline[0]?.code).toBe('slicer_3')
    expect(timeline[1]?.code).toBe('slicer_2')
  })
})
