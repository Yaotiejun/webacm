import { describe, expect, it } from 'vitest'
import {
  applySliceTelemetryConfigSnapshot,
  DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES,
  DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES,
  exportSliceTelemetryConfigJson,
  getSliceTelemetryDigestMaxEntries,
  getSliceTelemetryConfigSnapshot,
  getSliceTelemetryTimelineMaxEntries,
  importSliceTelemetryConfigJson,
  resetSliceTelemetryConfig,
  resetSliceTelemetryDigestMaxEntriesOverride,
  resetSliceTelemetryTimelineMaxEntriesOverride,
  setSliceTelemetryDigestMaxEntriesOverride,
  setSliceTelemetryTimelineMaxEntriesOverride,
} from './sliceTelemetryConfig'

describe('slicer.sliceTelemetryConfig', () => {
  it('uses default max entries when no override', () => {
    resetSliceTelemetryDigestMaxEntriesOverride()
    expect(getSliceTelemetryDigestMaxEntries()).toBe(DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES)
  })

  it('applies valid override with floor and lower clamp', () => {
    setSliceTelemetryDigestMaxEntriesOverride(12.9)
    expect(getSliceTelemetryDigestMaxEntries()).toBe(12)
    setSliceTelemetryDigestMaxEntriesOverride(-10)
    expect(getSliceTelemetryDigestMaxEntries()).toBe(0)
  })

  it('ignores invalid override and supports reset', () => {
    setSliceTelemetryDigestMaxEntriesOverride(9)
    setSliceTelemetryDigestMaxEntriesOverride('bad')
    expect(getSliceTelemetryDigestMaxEntries()).toBe(9)
    resetSliceTelemetryDigestMaxEntriesOverride()
    expect(getSliceTelemetryDigestMaxEntries()).toBe(DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES)
  })

  it('supports timeline max entries override and reset', () => {
    resetSliceTelemetryTimelineMaxEntriesOverride()
    expect(getSliceTelemetryTimelineMaxEntries()).toBe(DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES)
    setSliceTelemetryTimelineMaxEntriesOverride(33.8)
    expect(getSliceTelemetryTimelineMaxEntries()).toBe(33)
    setSliceTelemetryTimelineMaxEntriesOverride('bad')
    expect(getSliceTelemetryTimelineMaxEntries()).toBe(33)
    resetSliceTelemetryTimelineMaxEntriesOverride()
    expect(getSliceTelemetryTimelineMaxEntries()).toBe(DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES)
  })

  it('supports unified snapshot import/export/reset flow', () => {
    resetSliceTelemetryConfig()
    const applied = applySliceTelemetryConfigSnapshot({
      digestMaxEntries: 9.2,
      timelineMaxEntries: 31.9,
    })
    expect(applied.digestMaxEntries).toBe(9)
    expect(applied.timelineMaxEntries).toBe(31)
    const json = exportSliceTelemetryConfigJson()
    expect(json).toContain('"digestMaxEntries": 9')
    const imported = importSliceTelemetryConfigJson('{"digestMaxEntries":4.8,"timelineMaxEntries":15.3}')
    expect(imported.digestMaxEntries).toBe(4)
    expect(imported.timelineMaxEntries).toBe(15)
    expect(getSliceTelemetryConfigSnapshot().digestMaxEntries).toBe(4)
    const reset = resetSliceTelemetryConfig()
    expect(reset.digestMaxEntries).toBe(DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES)
    expect(reset.timelineMaxEntries).toBe(DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES)
  })
})
