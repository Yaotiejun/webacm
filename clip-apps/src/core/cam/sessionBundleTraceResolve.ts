import {
  TRACE_NONE_VALUE,
  TRACE_SOURCE_FINGERPRINT_KEY,
  TRACE_SOURCE_LABEL_KEY,
} from '@/core/traceKeys'

export interface CamSessionBundleTraceLike {
  trace?: {
    [TRACE_SOURCE_LABEL_KEY]?: string | null
    [TRACE_SOURCE_FINGERPRINT_KEY]?: string | null
  } | null
  targetRun?: {
    id?: string | null
    name?: string | null
  } | null
  migrationMeta?: {
    engineHints?: {
      targetGcodeSha256?: string | null
    } | null
  } | null
}

export interface CamSessionBundleResolvedTrace {
  sourceLabel: string
  sourceFingerprint: string
}

function normalizeText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

export function resolveCamSessionBundleTrace(input: CamSessionBundleTraceLike | null | undefined): CamSessionBundleResolvedTrace {
  const traceSourceLabel = normalizeText(input?.trace?.[TRACE_SOURCE_LABEL_KEY])
  const traceSourceFingerprint = normalizeText(input?.trace?.[TRACE_SOURCE_FINGERPRINT_KEY])

  let fallbackSourceLabel = TRACE_NONE_VALUE
  const runId = normalizeText(input?.targetRun?.id)
  const runName = normalizeText(input?.targetRun?.name)
  if (runId && runName) fallbackSourceLabel = `${runId}:${runName}`
  else if (runId) fallbackSourceLabel = runId
  else if (runName) fallbackSourceLabel = runName

  const fallbackSourceFingerprint = normalizeText(input?.migrationMeta?.engineHints?.targetGcodeSha256) || TRACE_NONE_VALUE

  return {
    sourceLabel: traceSourceLabel || fallbackSourceLabel,
    sourceFingerprint: traceSourceFingerprint || fallbackSourceFingerprint,
  }
}
