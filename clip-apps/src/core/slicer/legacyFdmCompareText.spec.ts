import { describe, expect, it } from 'vitest'
import {
  FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION,
  buildFdmLegacyComparisonBundleText,
  formatLegacyFdmDebugText,
  resolveFdmLegacyComparisonSourceFingerprint,
} from './legacyFdmCompareText'
import { TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'

describe('slicer.legacyFdmCompareText', () => {
  it('formats legacy debug text with scope prefix', () => {
    const text = formatLegacyFdmDebugText(
      {
        ready: false,
        hasSliceImpl: true,
        initErrorMessage: 'init failed',
        legacyImportErrorMessage: 'import failed',
      },
      'live',
    )
    expect(text).toContain('liveLegacy.ready=0')
    expect(text).toContain('liveLegacy.hasSlice=1')
    expect(text).toContain('liveLegacy.initError=init failed')
    expect(text).toContain('liveLegacy.importError=import failed')
  })

  it('builds bundle text with target/current/diff/context sections', () => {
    const text = buildFdmLegacyComparisonBundleText({
      liveLegacyDebug: { ready: true, hasSliceImpl: true, initErrorMessage: null, legacyImportErrorMessage: null },
      jobLegacyDebug: { ready: false, hasSliceImpl: false, initErrorMessage: null, legacyImportErrorMessage: 'boom' },
      fallbackReasonCode: 'legacy_impl_missing',
      telemetryDigest: [],
      jobSliceInputMeta: { vertexCount: 9, triangleCount: 1, planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, zSpanMm: 1 },
      generatedAtIso: '2026-05-01T10:00:00.000Z',
      sourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
      sourceFingerprint: TRACE_FIXTURE_SOURCE_FINGERPRINT,
    })
    expect(text).toContain('--- comparisonMeta ---')
    expect(text).toContain(`schemaVersion=${FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`)
    expect(text).toContain('bundleKind=fdmLegacyComparison')
    expect(text).toContain('generatedAt=2026-05-01T10:00:00.000Z')
    expect(text).toContain(`traceSchemaVersion=${TRACE_SCHEMA_VERSION}`)
    expect(text).toContain(`sourceLabel=${TRACE_FIXTURE_SOURCE_LABEL}`)
    expect(text).toContain(`sourceFingerprint=${TRACE_FIXTURE_SOURCE_FINGERPRINT}`)
    const traceSchemaIdx = text.indexOf(`traceSchemaVersion=${TRACE_SCHEMA_VERSION}`)
    const sourceLabelIdx = text.indexOf(`sourceLabel=${TRACE_FIXTURE_SOURCE_LABEL}`)
    const sourceFingerprintIdx = text.indexOf(`sourceFingerprint=${TRACE_FIXTURE_SOURCE_FINGERPRINT}`)
    expect(traceSchemaIdx).toBeGreaterThan(-1)
    expect(sourceLabelIdx).toBeGreaterThan(traceSchemaIdx)
    expect(sourceFingerprintIdx).toBeGreaterThan(sourceLabelIdx)
    expect(text).toContain('targetLegacy.ready=0')
    expect(text).toContain('currentLegacy.ready=1')
    expect(text).toContain('--- targetLegacy ---')
    expect(text).toContain('--- currentLegacy ---')
    expect(text).toContain('--- legacyHintDiff ---')
    expect(text).toContain('--- slicerContext ---')
    expect(text).toContain('ready N->Y')
    expect(text).toContain('hasSlice N->Y')
    expect(text).toContain('importError differs')
    expect(text).toContain('fallbackReason=legacy_impl_missing')
    expect(text).toContain('telemetryDigest.size=0')
    expect(text).toContain('jobSliceInputMeta={"vertexCount":9')
  })

  it('uses stable placeholder fields for missing legacy snapshots in bundle text', () => {
    const text = buildFdmLegacyComparisonBundleText({
      liveLegacyDebug: null,
      jobLegacyDebug: null,
      fallbackReasonCode: null,
      telemetryDigest: [],
      jobSliceInputMeta: null,
      generatedAtIso: '2026-05-01T10:00:00.000Z',
    })
    expect(text).toContain('targetLegacy.ready=?')
    expect(text).toContain('targetLegacy.hasSlice=?')
    expect(text).toContain('targetLegacy.initError=<none>')
    expect(text).toContain('targetLegacy.importError=<none>')
    expect(text).toContain('currentLegacy.ready=?')
    expect(text).toContain('currentLegacy.hasSlice=?')
    expect(text).toContain('currentLegacy.initError=<none>')
    expect(text).toContain('currentLegacy.importError=<none>')
    expect(text).toContain('sourceLabel=<none>')
    expect(text).toContain('fallbackReason=none')
    expect(text).toContain('telemetryDigest.size=0')
  })

  it('prefers explicit sourceFingerprint override when provided', () => {
    const text = buildFdmLegacyComparisonBundleText({
      liveLegacyDebug: null,
      jobLegacyDebug: null,
      fallbackReasonCode: null,
      telemetryDigest: [],
      jobSliceInputMeta: null,
      generatedAtIso: '2026-05-01T10:00:00.000Z',
      sourceLabel: 'job-2:Cube',
      sourceFingerprint: 'manual:abc',
    })
    expect(text).toContain('sourceLabel=job-2:Cube')
    expect(text).toContain('sourceFingerprint=manual:abc')
  })

  it('builds deterministic sourceFingerprint from job context', () => {
    const a = resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: [],
      jobSliceInputMeta: null,
      jobLegacyDebug: null,
    })
    const b = resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: [],
      jobSliceInputMeta: null,
      jobLegacyDebug: null,
    })
    expect(a).toMatch(/^fnv1a32:[0-9a-f]{8}$/)
    expect(a).toBe(b)
  })

  it('keeps sourceFingerprint stable when object key order differs', () => {
    const telemetryA = [
      {
        kind: 'slice_fallback',
        code: 'legacy_timeout',
        reasonCode: 'legacy_slice_timeout',
        message: 'timeout',
        ts: 123,
      },
    ]
    const telemetryB = [
      {
        ts: 123,
        message: 'timeout',
        reasonCode: 'legacy_slice_timeout',
        code: 'legacy_timeout',
        kind: 'slice_fallback',
      },
    ]
    const inputMetaA = {
      vertexCount: 9,
      triangleCount: 3,
      planarBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      zSpanMm: 5,
    }
    const inputMetaB = {
      zSpanMm: 5,
      planarBounds: { maxY: 1, maxX: 1, minY: 0, minX: 0 },
      triangleCount: 3,
      vertexCount: 9,
    }

    const a = resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: telemetryA,
      jobSliceInputMeta: inputMetaA,
      jobLegacyDebug: { ready: true, hasSliceImpl: false, initErrorMessage: null, legacyImportErrorMessage: null },
    })
    const b = resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: telemetryB,
      jobSliceInputMeta: inputMetaB,
      jobLegacyDebug: { hasSliceImpl: false, legacyImportErrorMessage: null, ready: true, initErrorMessage: null },
    })
    expect(a).toBe(b)
  })
})

