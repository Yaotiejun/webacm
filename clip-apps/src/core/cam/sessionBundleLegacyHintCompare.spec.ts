import { describe, expect, it } from 'vitest'
import {
  CAM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION,
  buildCamLegacyHintComparisonBundleText,
  compareCamSessionLegacyHintWithCurrent,
  formatCamCurrentLegacyHealth,
  formatCamSessionLegacyTargetHint,
  resolveCamLegacyComparisonSourceFingerprint,
} from './sessionBundleLegacyHintCompare'
import { TRACE_SCHEMA_VERSION } from '@/core/traceKeys'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'

describe('cam.sessionBundleLegacyHintCompare', () => {
  it('returns no mismatch when target hints are absent', () => {
    const out = compareCamSessionLegacyHintWithCurrent(undefined, {
      ready: true,
      hasSlice: true,
      hasExport: true,
      legacyImportErrorMessage: null,
    })
    expect(out.mismatches).toEqual([])
  })

  it('reports boolean mismatches', () => {
    const out = compareCamSessionLegacyHintWithCurrent(
      {
        targetLegacyReady: false,
        targetLegacyHasSlice: true,
        targetLegacyHasExport: true,
      },
      {
        ready: true,
        hasSlice: false,
        hasExport: false,
        legacyImportErrorMessage: null,
      },
    )
    expect(out.mismatches).toEqual([
      'ready N->Y',
      'slice Y->N',
      'export Y->N',
    ])
  })

  it('reports importError difference when target has importError', () => {
    const out = compareCamSessionLegacyHintWithCurrent(
      { targetLegacyImportError: 'failed to fetch dynamically imported module' },
      {
        ready: false,
        hasSlice: false,
        hasExport: false,
        legacyImportErrorMessage: null,
      },
    )
    expect(out.mismatches).toContain('importError differs')
  })

  it('formats target hint summary text', () => {
    const text = formatCamSessionLegacyTargetHint({
      targetLegacyReady: true,
      targetLegacyHasSlice: false,
      targetLegacyHasExport: true,
      targetLegacyImportError: 'failed to fetch dynamically imported module',
    })
    expect(text).toContain('targetLegacy.ready=1')
    expect(text).toContain('targetLegacy.hasSlice=0')
    expect(text).toContain('targetLegacy.hasExport=1')
    expect(text).toContain('targetLegacy.importError=failed to fetch dynamically imported module')
  })

  it('formats current legacy health summary text', () => {
    const text = formatCamCurrentLegacyHealth({
      ready: false,
      hasSlice: true,
      hasExport: false,
      legacyImportErrorMessage: 'boom',
    })
    expect(text).toContain('currentLegacy.ready=0')
    expect(text).toContain('currentLegacy.hasSlice=1')
    expect(text).toContain('currentLegacy.hasExport=0')
    expect(text).toContain('currentLegacy.importError=boom')
  })

  it('builds bundle text with target/current/diff sections', () => {
    const text = buildCamLegacyHintComparisonBundleText({
      hints: {
        targetLegacyReady: false,
        targetLegacyHasSlice: true,
        targetLegacyHasExport: true,
        targetGcodeSha256: TRACE_FIXTURE_SOURCE_FINGERPRINT,
      },
      current: {
        ready: true,
        hasSlice: true,
        hasExport: false,
        legacyImportErrorMessage: null,
      },
      generatedAtIso: '2026-05-01T10:00:00.000Z',
      sourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
    })
    expect(text).toContain('--- comparisonMeta ---')
    expect(text).toContain(`schemaVersion=${CAM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`)
    expect(text).toContain('bundleKind=camLegacyComparison')
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
    expect(text).toContain('--- targetLegacy ---')
    expect(text).toContain('--- currentLegacy ---')
    expect(text).toContain('--- legacyHintDiff ---')
    expect(text).toContain('ready N->Y')
    expect(text).toContain('export Y->N')
  })

  it('uses stable placeholder keys in bundle text when hints are missing', () => {
    const text = buildCamLegacyHintComparisonBundleText({
      hints: null,
      current: {
        ready: true,
        hasSlice: false,
        hasExport: true,
        legacyImportErrorMessage: null,
      },
      generatedAtIso: '2026-05-01T10:00:00.000Z',
    })
    expect(text).toContain('targetLegacy.ready=?')
    expect(text).toContain('targetLegacy.hasSlice=?')
    expect(text).toContain('targetLegacy.hasExport=?')
    expect(text).toContain('targetLegacy.importError=<none>')
    expect(text).toContain('currentLegacy.importError=<none>')
    expect(text).toContain('sourceLabel=<none>')
    expect(text).toContain('sourceFingerprint=<none>')
    expect(text).toContain('--- legacyHintDiff ---\n<none>')
  })

  it('resolves source fingerprint from targetGcodeSha256', () => {
    expect(
      resolveCamLegacyComparisonSourceFingerprint({
        targetGcodeSha256: 'abc',
      }),
    ).toBe('abc')
    expect(resolveCamLegacyComparisonSourceFingerprint(null)).toBe('<none>')
  })
})

