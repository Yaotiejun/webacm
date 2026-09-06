import type { SliceLegacyDebugSnapshot } from '@/api/slice'
import type { SliceTelemetryDigestEntry } from './sliceTelemetryDigest'
import type { SliceInputMeta } from '@/api/slice'
import {
  buildTraceHeaderLines,
  TRACE_NONE_VALUE,
} from '@/core/traceKeys'
import { toStableJsonText } from '@/core/stableJson'

export const FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION = 1

function normalizeText(v: string | null | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

function hashFnv1a32(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i) & 0xff
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function resolveFdmLegacyComparisonSourceFingerprint(input: {
  telemetryDigest: SliceTelemetryDigestEntry[]
  jobSliceInputMeta: SliceInputMeta | null | undefined
  jobLegacyDebug: SliceLegacyDebugSnapshot | null | undefined
}): string {
  const raw = toStableJsonText({
    telemetryDigest: input.telemetryDigest,
    jobSliceInputMeta: input.jobSliceInputMeta ?? null,
    jobLegacyDebug: input.jobLegacyDebug ?? null,
  })
  return `fnv1a32:${hashFnv1a32(raw)}`
}

export function formatLegacyFdmDebugText(
  debug: SliceLegacyDebugSnapshot | null | undefined,
  scope: string,
  options?: { includeEmptyFields?: boolean },
): string {
  const prefix = scope.endsWith('Legacy') ? scope : `${scope}Legacy`
  if (!debug) {
    if (!options?.includeEmptyFields) return `${prefix}=<none>`
    return [`${prefix}.ready=?`, `${prefix}.hasSlice=?`, `${prefix}.initError=<none>`, `${prefix}.importError=<none>`].join('\n')
  }
  const lines = [
    `${prefix}.ready=${debug.ready ? '1' : '0'}`,
    `${prefix}.hasSlice=${debug.hasSliceImpl ? '1' : '0'}`,
  ]
  const initError = normalizeText(debug.initErrorMessage)
  const importError = normalizeText(debug.legacyImportErrorMessage)
  if (initError) lines.push(`${prefix}.initError=${initError}`)
  else if (options?.includeEmptyFields) lines.push(`${prefix}.initError=<none>`)
  if (importError) lines.push(`${prefix}.importError=${importError}`)
  else if (options?.includeEmptyFields) lines.push(`${prefix}.importError=<none>`)
  return lines.join('\n')
}

export function buildFdmLegacyComparisonBundleText(input: {
  liveLegacyDebug: SliceLegacyDebugSnapshot | null | undefined
  jobLegacyDebug: SliceLegacyDebugSnapshot | null | undefined
  fallbackReasonCode: string | null | undefined
  telemetryDigest: SliceTelemetryDigestEntry[]
  jobSliceInputMeta: SliceInputMeta | null | undefined
  generatedAtIso?: string | null
  sourceLabel?: string | null
  sourceFingerprint?: string | null
}): string {
  const generatedAt = (input.generatedAtIso ?? '').trim() || new Date().toISOString()
  const sourceLabel = normalizeText(input.sourceLabel) || TRACE_NONE_VALUE
  const sourceFingerprint =
    normalizeText(input.sourceFingerprint) ||
    resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: input.telemetryDigest,
      jobSliceInputMeta: input.jobSliceInputMeta,
      jobLegacyDebug: input.jobLegacyDebug,
    })
  const mismatches: string[] = []
  const live = input.liveLegacyDebug
  const job = input.jobLegacyDebug
  if (live && job) {
    if (live.ready !== job.ready) mismatches.push(`ready ${job.ready ? 'Y' : 'N'}->${live.ready ? 'Y' : 'N'}`)
    if (live.hasSliceImpl !== job.hasSliceImpl) {
      mismatches.push(`hasSlice ${job.hasSliceImpl ? 'Y' : 'N'}->${live.hasSliceImpl ? 'Y' : 'N'}`)
    }
    const liveImport = (live.legacyImportErrorMessage ?? '').trim()
    const jobImport = (job.legacyImportErrorMessage ?? '').trim()
    if (liveImport !== jobImport && (liveImport || jobImport)) {
      mismatches.push('importError differs')
    }
  }

  const lines: string[] = []
  lines.push('--- comparisonMeta ---')
  lines.push(`schemaVersion=${FDM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`)
  lines.push('bundleKind=fdmLegacyComparison')
  lines.push(`generatedAt=${generatedAt}`)
  lines.push(...buildTraceHeaderLines(sourceLabel, sourceFingerprint))
  lines.push('')
  lines.push('--- targetLegacy ---')
  lines.push(formatLegacyFdmDebugText(input.jobLegacyDebug, 'target', { includeEmptyFields: true }))
  lines.push('')
  lines.push('--- currentLegacy ---')
  lines.push(formatLegacyFdmDebugText(input.liveLegacyDebug, 'current', { includeEmptyFields: true }))
  lines.push('')
  lines.push('--- legacyHintDiff ---')
  lines.push(mismatches.length ? mismatches.join(', ') : '<none>')
  lines.push('')
  lines.push('--- slicerContext ---')
  lines.push(`fallbackReason=${input.fallbackReasonCode ?? 'none'}`)
  lines.push(`telemetryDigest.size=${input.telemetryDigest.length}`)
  if (input.jobSliceInputMeta) {
    lines.push(`jobSliceInputMeta=${JSON.stringify(input.jobSliceInputMeta)}`)
  }
  return lines.join('\n')
}

