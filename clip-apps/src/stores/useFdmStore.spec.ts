import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  useFdmStore,
  FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY,
  FDM_SLICE_BACKEND_KIND_STORAGE_KEY,
} from './useFdmStore'

describe('stores.useFdmStore telemetry timeline', () => {
  beforeEach(() => {
    localStorage.removeItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY)
    localStorage.removeItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-30T10:00:00.000Z'))
  })

  it('prepends telemetry entries with timestamp', () => {
    const store = useFdmStore()
    store.pushSliceTelemetryEvent({
      kind: 'slicer_fallback',
      code: 'slicer_legacy_slice_timeout',
      reasonCode: 'legacy_slice_timeout',
      message: 'legacy slice timeout after 500ms',
    })
    expect(store.sliceTelemetryTimeline.length).toBe(1)
    expect(store.sliceTelemetryTimeline[0]?.ts).toBe(new Date('2026-04-30T10:00:00.000Z').getTime())
    expect(store.sliceTelemetryTimeline[0]?.code).toBe('slicer_legacy_slice_timeout')
  })

  it('caps telemetry timeline length to 20 with newest-first order', () => {
    const store = useFdmStore()
    for (let i = 0; i < 25; i += 1) {
      vi.setSystemTime(new Date(`2026-04-30T10:00:${String(i).padStart(2, '0')}.000Z`))
      store.pushSliceTelemetryEvent({
        kind: 'slicer_fallback',
        code: `slicer_event_${i}`,
        reasonCode: 'legacy_slice_failed',
        message: `event ${i}`,
      })
    }
    expect(store.sliceTelemetryTimeline.length).toBe(20)
    expect(store.sliceTelemetryTimeline[0]?.code).toBe('slicer_event_24')
    expect(store.sliceTelemetryTimeline[19]?.code).toBe('slicer_event_5')
  })

  it('clears telemetry timeline', () => {
    const store = useFdmStore()
    store.pushSliceTelemetryEvent({
      kind: 'slicer_fallback',
      code: 'slicer_legacy_slice_reentry',
      reasonCode: 'legacy_slice_reentry',
      message: 'legacy slice already running',
    })
    expect(store.sliceTelemetryTimeline.length).toBe(1)
    store.clearSliceTelemetryTimeline()
    expect(store.sliceTelemetryTimeline).toEqual([])
  })

  it('stores sliceResult with inputMeta for diagnostics consumers', () => {
    const store = useFdmStore()
    store.setSliceResult({
      summary: { layers: 1, timeMinutes: 1, filamentMm: 1 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
      inputMeta: {
        vertexCount: 9,
        triangleCount: 1,
        planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        zSpanMm: 0.2,
      },
      fallback: null,
    })
    expect(store.sliceResult?.inputMeta?.triangleCount).toBe(1)
  })

  it('setSliceResult decouples store from caller-held result references', () => {
    const store = useFdmStore()
    const result = {
      summary: { layers: 2, timeMinutes: 2, filamentMm: 2 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
      fallback: null,
    } as const
    store.setSliceResult(result as any)
    ;(result.summary as any).layers = 99
    expect(store.sliceResult?.summary.layers).toBe(2)
  })

  it('setSliceResult decouples legacyDebug from caller-held references', () => {
    const store = useFdmStore()
    const legacyDebug = {
      ready: true,
      initErrorMessage: null,
      hasSliceImpl: true,
      legacyImportErrorMessage: null,
    }
    store.setSliceResult({
      summary: { layers: 1, timeMinutes: 1, filamentMm: 1 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
      legacyDebug,
      fallback: null,
    })
    legacyDebug.ready = false
    expect(store.sliceResult?.legacyDebug?.ready).toBe(true)
  })

  it('setSliceResult null clears stored result', () => {
    const store = useFdmStore()
    store.setSliceResult({
      summary: { layers: 1, timeMinutes: 1, filamentMm: 1 },
      preview: { bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, layers: [] },
      fallback: null,
    })
    store.setSliceResult(null)
    expect(store.sliceResult).toBeNull()
  })

  it('setBackendKind and setSlicing update workspace flags', () => {
    const store = useFdmStore()
    store.setBackendKind('mock')
    store.setSlicing(true)
    expect(store.backendKind).toBe('mock')
    expect(store.slicing).toBe(true)
    expect(localStorage.getItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY)).toBe('mock')
  })

  it('setExportGcodeIncludeDiagnostics updates state and localStorage', () => {
    const store = useFdmStore()
    expect(store.exportGcodeIncludeDiagnostics).toBe(true)
    store.setExportGcodeIncludeDiagnostics(false)
    expect(store.exportGcodeIncludeDiagnostics).toBe(false)
    expect(localStorage.getItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)).toBe('0')
    store.setExportGcodeIncludeDiagnostics(true)
    expect(localStorage.getItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)).toBe('1')
  })

  it('restores telemetry timeline from saved digest entries', () => {
    const store = useFdmStore()
    store.setSliceTelemetryTimeline([
      {
        kind: 'slicer_fallback',
        code: 'slicer_legacy_slice_timeout',
        reasonCode: 'legacy_slice_timeout',
        message: 'timeout',
        ts: 100,
      },
      {
        kind: 'slicer_fallback',
        code: 'slicer_legacy_slice_failed',
        reasonCode: 'legacy_slice_failed',
        message: 'failed',
        ts: 110,
      },
    ])
    expect(store.sliceTelemetryTimeline.length).toBe(2)
    expect(store.sliceTelemetryTimeline[0]?.ts).toBe(110)
    expect(store.sliceTelemetryTimeline[0]?.code).toBe('slicer_legacy_slice_failed')
  })
})

describe('stores.useFdmStore slice backend persistence', () => {
  beforeEach(() => {
    localStorage.removeItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY)
    localStorage.removeItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)
  })

  it('initializes backendKind from localStorage when mock was saved', () => {
    localStorage.setItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY, 'mock')
    setActivePinia(createPinia())
    expect(useFdmStore().backendKind).toBe('mock')
  })

  it('defaults backendKind to kiri when localStorage value is invalid', () => {
    localStorage.setItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY, 'bogus')
    setActivePinia(createPinia())
    expect(useFdmStore().backendKind).toBe('kiri')
  })

  it('initializes exportGcodeIncludeDiagnostics false when localStorage is 0', () => {
    localStorage.setItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY, '0')
    setActivePinia(createPinia())
    expect(useFdmStore().exportGcodeIncludeDiagnostics).toBe(false)
  })

  it('defaults exportGcodeIncludeDiagnostics to true when localStorage value is invalid', () => {
    localStorage.setItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY, 'bogus')
    setActivePinia(createPinia())
    expect(useFdmStore().exportGcodeIncludeDiagnostics).toBe(true)
  })
})
