import { sha256HexUtf8 } from '@/core/cam/camGcodeFingerprint'
import { evaluateFdmMigrationComplete } from '@/core/slicer/fdmMigrationComplete'
import {
  buildFdmLegacyComparisonBundleText,
  FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION,
  resolveFdmLegacyComparisonSourceFingerprint,
} from '@/core/slicer/legacyFdmCompareText'
import { TRACE_FIXTURE_SOURCE_FINGERPRINT, TRACE_FIXTURE_SOURCE_LABEL } from '@/core/traceFixtures'
import { shouldTryLegacyFdm, resolveLegacyFdmMode } from '@/core/slicer/kiriRuntimePolicy'

export interface FdmLegacyMigrationCompleteResult {
  ok: boolean
  checks: {
    shellGate: boolean
    bundleSchema: boolean
    bundlePin: boolean
    legacyPolicy: boolean
  }
  errors: string[]
}

export function buildCanonicalFdmLegacyBundle(): string {
  const digest = [{ phase: 'slice', at: 1, message: 'migration-gate' }]
  const meta = {
    vertexCount: 18,
    triangleCount: 2,
    planarBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
    zSpanMm: 1,
  }
  return buildFdmLegacyComparisonBundleText({
    liveLegacyDebug: { ready: true, hasSliceImpl: true, initErrorMessage: null, legacyImportErrorMessage: null },
    jobLegacyDebug: { ready: false, hasSliceImpl: false, initErrorMessage: null, legacyImportErrorMessage: 'boom' },
    fallbackReasonCode: 'legacy_impl_missing',
    telemetryDigest: digest,
    jobSliceInputMeta: meta,
    generatedAtIso: '2026-05-19T12:00:00.000Z',
    sourceLabel: TRACE_FIXTURE_SOURCE_LABEL,
    sourceFingerprint: TRACE_FIXTURE_SOURCE_FINGERPRINT,
  })
}

/**
 * Phase 3 — FDM legacy comparison bundle + policy.
 * Live legacy slice: `FDM_LIVE_MIGRATION=1` + `npm run soak:fdm:live` (when added).
 */
export async function evaluateFdmLegacyMigrationComplete(): Promise<FdmLegacyMigrationCompleteResult> {
  const errors: string[] = []
  const shell = evaluateFdmMigrationComplete()
  if (!shell.ok) errors.push(...shell.errors.map((e) => `shell: ${e}`))

  const bundle = buildCanonicalFdmLegacyBundle()
  const bundleSchema =
    bundle.includes(`schemaVersion=${FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`) &&
    bundle.includes('bundleKind=fdmLegacyComparison')
  if (!bundleSchema) errors.push('FDM legacy bundle schema')

  const bundleSha = await sha256HexUtf8(bundle)
  const pin = bundleSha.length === 64 && bundle.includes('ready N->Y')
  if (!pin) errors.push('FDM legacy bundle content pin failed')

  const fp = resolveFdmLegacyComparisonSourceFingerprint({
    telemetryDigest: [{ phase: 'slice', at: 1, message: 'migration-gate' }],
    jobSliceInputMeta: {
      vertexCount: 18,
      triangleCount: 2,
      planarBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      zSpanMm: 1,
    },
    jobLegacyDebug: null,
  })
  if (!fp.startsWith('fnv1a32:')) errors.push('FDM legacy fingerprint format')

  const legacyPolicy =
    shouldTryLegacyFdm('auto') && !shouldTryLegacyFdm('0') && resolveLegacyFdmMode('1') === '1'
  if (!legacyPolicy) errors.push('legacy FDM policy')

  return {
    ok: errors.length === 0,
    checks: {
      shellGate: shell.ok,
      bundleSchema,
      bundlePin: pin,
      legacyPolicy,
    },
    errors,
  }
}
