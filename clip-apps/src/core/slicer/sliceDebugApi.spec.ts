import { describe, expect, it } from 'vitest'
import { createSlicerDebugApi, getSlicerDebugApi, installSlicerDebugApi, uninstallSlicerDebugApi } from './sliceDebugApi'
import {
  resetSliceTelemetryDigestMaxEntriesOverride,
  resetSliceTelemetryTimelineMaxEntriesOverride,
} from './sliceTelemetryConfig'

describe('slicer.sliceDebugApi', () => {
  it('gets/sets/resets telemetry digest max entries', () => {
    resetSliceTelemetryDigestMaxEntriesOverride()
    resetSliceTelemetryTimelineMaxEntriesOverride()
    const api = createSlicerDebugApi()
    expect(api.getTelemetryDigestMaxEntries()).toBe(5)
    expect(api.setTelemetryDigestMaxEntries(12.8)).toBe(12)
    expect(api.getTelemetryDigestMaxEntries()).toBe(12)
    expect(api.resetTelemetryDigestMaxEntries()).toBe(5)
    expect(api.getTelemetryTimelineMaxEntries()).toBe(20)
    expect(api.setTelemetryTimelineMaxEntries(7.9)).toBe(7)
    expect(api.resetTelemetryTimelineMaxEntries()).toBe(20)
  })

  it('installs and uninstalls window debug api', () => {
    const w = {} as Window & { __slicerDebug?: ReturnType<typeof createSlicerDebugApi> }
    installSlicerDebugApi(w)
    expect(typeof getSlicerDebugApi(w)?.getTelemetryDigestMaxEntries).toBe('function')
    uninstallSlicerDebugApi(w)
    expect(getSlicerDebugApi(w)).toBeUndefined()
  })

  it('exposes timeline dump and clear hooks', () => {
    const changes: Array<{ digestMaxEntries: number; timelineMaxEntries: number }> = []
    const api = createSlicerDebugApi({
      dumpTimeline: () => [
        {
          kind: 'slicer_fallback',
          code: 'slicer_legacy_slice_failed',
          reasonCode: 'legacy_slice_failed',
          message: 'failed',
          ts: 1,
        },
      ],
      clearTimeline: () => {
        // no-op in test, only verify call path exists
      },
      onConfigChange: (cfg) => changes.push(cfg),
    })
    expect(api.dumpTimeline().length).toBe(1)
    expect(api.dumpTimeline()[0]?.code).toBe('slicer_legacy_slice_failed')
    expect(api.dumpDigest().length).toBe(1)
    expect(api.dumpDigest()[0]?.reasonCode).toBe('legacy_slice_failed')
    const text = api.exportDigestText({ header: 'jobId=j1' })
    expect(text.startsWith('jobId=j1\n')).toBe(true)
    expect(text).toContain('slicer_legacy_slice_failed / legacy_slice_failed')
    const cfg = api.importConfigJson('{"digestMaxEntries":3.7,"timelineMaxEntries":8.2}')
    expect(cfg.digestMaxEntries).toBe(3)
    expect(cfg.timelineMaxEntries).toBe(8)
    expect(api.exportConfigJson()).toContain('"digestMaxEntries": 3')
    const reset = api.resetConfig()
    expect(reset.digestMaxEntries).toBe(5)
    expect(reset.timelineMaxEntries).toBe(20)
    expect(changes.length >= 2).toBe(true)
    expect(() => api.clearTimeline()).not.toThrow()
  })

  it('exportDiagnostics includes sliceInputMeta when getDiagnosticsContext provides it', () => {
    const api = createSlicerDebugApi({
      dumpTimeline: () => [],
      getDiagnosticsContext: () => ({
        jobId: 'j-1',
        liveSliceInputMeta: {
          vertexCount: 9,
          triangleCount: 1,
          planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
          zSpanMm: 0.5,
        },
        savedJobSliceInputMeta: null,
        liveLegacyDebug: {
          ready: true,
          initErrorMessage: null,
          hasSliceImpl: false,
          legacyImportErrorMessage: 'failed to fetch dynamically imported module',
        },
        savedJobLegacyDebug: null,
      }),
    })
    const text = api.exportDiagnostics({ header: 'h' })
    expect(text).toContain('--- sliceInputMeta ---')
    expect(text).toContain('--- legacyFdmDebug ---')
    expect(text).toContain('context.jobId=j-1')
    expect(text).toContain('"triangleCount":1')
    expect(text).toContain('"legacyImportErrorMessage":"failed to fetch dynamically imported module"')
  })
})
