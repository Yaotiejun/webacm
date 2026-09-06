import { describe, expect, it } from 'vitest'
import { buildSliceFallbackTelemetryEvent } from './sliceTelemetry'

describe('slicer.sliceTelemetry', () => {
  it('builds structured fallback telemetry event', () => {
    const out = buildSliceFallbackTelemetryEvent({
      reasonCode: 'legacy_slice_timeout',
      warningCode: 'slicer_legacy_slice_timeout',
      message: 'legacy slice timeout after 500ms',
    })
    expect(out).toEqual({
      kind: 'slicer_fallback',
      code: 'slicer_legacy_slice_timeout',
      reasonCode: 'legacy_slice_timeout',
      message: 'legacy slice timeout after 500ms',
    })
  })

  it('derives telemetry code when warningCode is absent', () => {
    const out = buildSliceFallbackTelemetryEvent({
      reasonCode: 'legacy_slice_failed',
      message: 'slice failed',
    })
    expect(out?.code).toBe('slicer_legacy_slice_failed')
    expect(out?.kind).toBe('slicer_fallback')
  })

  it('returns null when fallback is null', () => {
    expect(buildSliceFallbackTelemetryEvent(null)).toBeNull()
  })
})
