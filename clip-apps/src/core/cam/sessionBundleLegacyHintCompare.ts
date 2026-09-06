import type { CamLegacyDebugSnapshot } from '@/types/camJob'
import {
  buildTraceHeaderLines,
  TRACE_NONE_VALUE,
} from '@/core/traceKeys'

export const CAM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION = 1

export interface CamSessionBundleLegacyEngineHints {
  targetLegacyReady?: boolean | null
  targetLegacyHasSlice?: boolean | null
  targetLegacyHasExport?: boolean | null
  targetLegacyImportError?: string | null
  targetGcodeSha256?: string | null
}

export interface CamSessionLegacyHintDiff {
  mismatches: string[]
}

function toYN(v: boolean) {
  return v ? 'Y' : 'N'
}

function toFlag(v: boolean | null | undefined): string {
  return v == null ? '?' : v ? '1' : '0'
}

function normalizeText(v: string | null | undefined): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function resolveCamLegacyComparisonSourceFingerprint(
  hints: CamSessionBundleLegacyEngineHints | null | undefined,
): string {
  return normalizeText(hints?.targetGcodeSha256) || TRACE_NONE_VALUE
}

/** Compare bundle `migrationMeta.engineHints` target legacy flags with current runtime health. */
export function compareCamSessionLegacyHintWithCurrent(
  hints: CamSessionBundleLegacyEngineHints | null | undefined,
  current: Pick<CamLegacyDebugSnapshot, 'ready' | 'hasSlice' | 'hasExport' | 'legacyImportErrorMessage'>,
): CamSessionLegacyHintDiff {
  const mismatches: string[] = []
  if (!hints) return { mismatches }

  if (hints.targetLegacyReady != null && hints.targetLegacyReady !== current.ready) {
    mismatches.push(`ready ${toYN(hints.targetLegacyReady)}->${toYN(current.ready)}`)
  }
  if (hints.targetLegacyHasSlice != null && hints.targetLegacyHasSlice !== current.hasSlice) {
    mismatches.push(`slice ${toYN(hints.targetLegacyHasSlice)}->${toYN(current.hasSlice)}`)
  }
  if (hints.targetLegacyHasExport != null && hints.targetLegacyHasExport !== current.hasExport) {
    mismatches.push(`export ${toYN(hints.targetLegacyHasExport)}->${toYN(current.hasExport)}`)
  }

  const targetImport = typeof hints.targetLegacyImportError === 'string' ? hints.targetLegacyImportError.trim() : ''
  const currentImport = typeof current.legacyImportErrorMessage === 'string' ? current.legacyImportErrorMessage.trim() : ''
  if (targetImport && targetImport !== currentImport) {
    mismatches.push('importError differs')
  }

  return { mismatches }
}

/** Stable one-line summary for bundle target legacy hints. */
export function formatCamSessionLegacyTargetHint(
  hints: CamSessionBundleLegacyEngineHints | null | undefined,
): string | null {
  if (!hints) return null
  const hasAny =
    hints.targetLegacyReady != null ||
    hints.targetLegacyHasSlice != null ||
    hints.targetLegacyHasExport != null ||
    !!hints.targetLegacyImportError
  if (!hasAny) return null
  const parts = [
    `targetLegacy.ready=${toFlag(hints.targetLegacyReady)}`,
    `targetLegacy.hasSlice=${toFlag(hints.targetLegacyHasSlice)}`,
    `targetLegacy.hasExport=${toFlag(hints.targetLegacyHasExport)}`,
  ]
  if (hints.targetLegacyImportError) {
    parts.push(`targetLegacy.importError=${hints.targetLegacyImportError}`)
  }
  return parts.join('\n')
}

/** Stable one-line summary for current CAM legacy runtime health. */
export function formatCamCurrentLegacyHealth(
  current: Pick<CamLegacyDebugSnapshot, 'ready' | 'hasSlice' | 'hasExport' | 'legacyImportErrorMessage'>,
  options?: { includeEmptyImportError?: boolean },
): string {
  const parts = [
    `currentLegacy.ready=${current.ready ? '1' : '0'}`,
    `currentLegacy.hasSlice=${current.hasSlice ? '1' : '0'}`,
    `currentLegacy.hasExport=${current.hasExport ? '1' : '0'}`,
  ]
  const importError = normalizeText(current.legacyImportErrorMessage)
  if (importError) {
    parts.push(`currentLegacy.importError=${importError}`)
  } else if (options?.includeEmptyImportError) {
    parts.push('currentLegacy.importError=<none>')
  }
  return parts.join('\n')
}

function formatCamSessionLegacyTargetHintForBundle(hints: CamSessionBundleLegacyEngineHints | null | undefined): string {
  const ready = hints?.targetLegacyReady
  const hasSlice = hints?.targetLegacyHasSlice
  const hasExport = hints?.targetLegacyHasExport
  const importError = normalizeText(hints?.targetLegacyImportError)
  return [
    `targetLegacy.ready=${toFlag(ready)}`,
    `targetLegacy.hasSlice=${toFlag(hasSlice)}`,
    `targetLegacy.hasExport=${toFlag(hasExport)}`,
    `targetLegacy.importError=${importError || '<none>'}`,
  ].join('\n')
}

/** Full multi-section text block for migration issue/report copy. */
export function buildCamLegacyHintComparisonBundleText(input: {
  hints: CamSessionBundleLegacyEngineHints | null | undefined
  current: Pick<CamLegacyDebugSnapshot, 'ready' | 'hasSlice' | 'hasExport' | 'legacyImportErrorMessage'>
  generatedAtIso?: string | null
  sourceLabel?: string | null
}): string {
  const generatedAt = (input.generatedAtIso ?? '').trim() || new Date().toISOString()
  const sourceFingerprint = resolveCamLegacyComparisonSourceFingerprint(input.hints)
  const sourceLabel = normalizeText(input.sourceLabel) || TRACE_NONE_VALUE
  const target = formatCamSessionLegacyTargetHintForBundle(input.hints)
  const current = formatCamCurrentLegacyHealth(input.current, { includeEmptyImportError: true })
  const diff = compareCamSessionLegacyHintWithCurrent(input.hints, input.current)
  const diffLine = diff.mismatches.length ? diff.mismatches.join(', ') : '<none>'
  return [
    '--- comparisonMeta ---',
    `schemaVersion=${CAM_LEGACY_COMPARISON_BUNDLE_SCHEMA_VERSION}`,
    'bundleKind=camLegacyComparison',
    `generatedAt=${generatedAt}`,
    ...buildTraceHeaderLines(sourceLabel, sourceFingerprint),
    '',
    '--- targetLegacy ---',
    target,
    '',
    '--- currentLegacy ---',
    current,
    '',
    '--- legacyHintDiff ---',
    diffLine,
  ].join('\n')
}

