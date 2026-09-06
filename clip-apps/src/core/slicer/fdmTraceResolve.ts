import type { SliceInputMeta, SliceLegacyDebugSnapshot } from '@/api/slice'
import type { EstimateMetaExportContext } from './estimateMetaExport'
import type { SliceTelemetryDigestEntry } from './sliceTelemetryDigest'
import { buildTraceHeaderLines, TRACE_NONE_VALUE } from '@/core/traceKeys'
import { resolveFdmLegacyComparisonSourceFingerprint } from './legacyFdmCompareText'

export interface FdmTraceSourceLabelInput {
  selectedJobId: string | null | undefined
  selectedJobName: string | null | undefined
}

export function resolveFdmSourceLabel(input: FdmTraceSourceLabelInput): string {
  const id = typeof input.selectedJobId === 'string' ? input.selectedJobId.trim() : ''
  const name = typeof input.selectedJobName === 'string' ? input.selectedJobName.trim() : ''
  if (!id) return TRACE_NONE_VALUE
  return name ? `${id}:${name}` : id
}

export interface FdmTraceResolveInput {
  selectedJobId: string | null | undefined
  selectedJobName: string | null | undefined
  telemetryDigest: SliceTelemetryDigestEntry[]
  jobSliceInputMeta: SliceInputMeta | null | undefined
  jobLegacyDebug: SliceLegacyDebugSnapshot | null | undefined
}

export interface FdmResolvedTrace {
  sourceLabel: string
  sourceFingerprint: string
}

export interface FdmTraceExportContext {
  jobId: string | null
  jobName: string | null
  sourceLabel: string
  sourceFingerprint: string
}

export interface FdmTraceExportContextInput {
  selectedJobId: string | null | undefined
  selectedJobName: string | null | undefined
  trace: FdmResolvedTrace
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

export function buildFdmTraceExportContext(input: FdmTraceExportContextInput): FdmTraceExportContext {
  return {
    jobId: normalizeOptionalText(input.selectedJobId),
    jobName: normalizeOptionalText(input.selectedJobName),
    sourceLabel: input.trace.sourceLabel,
    sourceFingerprint: input.trace.sourceFingerprint,
  }
}

export interface FdmTraceHeaderLinesInput {
  sourceLabel: string | null | undefined
  sourceFingerprint: string | null | undefined
  selectedJobId: string | null | undefined
}

export function buildFdmTraceHeaderLines(input: FdmTraceHeaderLinesInput): string[] {
  const sourceLabel = typeof input.sourceLabel === 'string' && input.sourceLabel.trim() ? input.sourceLabel : TRACE_NONE_VALUE
  const sourceFingerprint =
    typeof input.sourceFingerprint === 'string' && input.sourceFingerprint.trim()
      ? input.sourceFingerprint
      : TRACE_NONE_VALUE
  const jobId = typeof input.selectedJobId === 'string' && input.selectedJobId.trim() ? input.selectedJobId : 'unknown'
  return [...buildTraceHeaderLines(sourceLabel, sourceFingerprint), `jobId=${jobId}`]
}

export interface BuildFdmEstimateMetaExportContextInput {
  device: string
  process: string
  material: string
  traceContext: FdmTraceExportContext
}

export function buildFdmEstimateMetaExportContext(
  input: BuildFdmEstimateMetaExportContextInput
): EstimateMetaExportContext {
  return {
    device: input.device,
    process: input.process,
    material: input.material,
    jobId: input.traceContext.jobId,
    jobName: input.traceContext.jobName,
    sourceLabel: input.traceContext.sourceLabel,
    sourceFingerprint: input.traceContext.sourceFingerprint,
  }
}

export interface FdmLegacyComparisonTraceInput {
  traceContext: FdmTraceExportContext
}

export function buildFdmLegacyComparisonTrace(input: FdmLegacyComparisonTraceInput): {
  sourceLabel: string
  sourceFingerprint: string
} {
  const sourceLabel = input.traceContext.sourceLabel.trim() || TRACE_NONE_VALUE
  const sourceFingerprint = input.traceContext.sourceFingerprint.trim() || TRACE_NONE_VALUE
  return { sourceLabel, sourceFingerprint }
}

export function resolveFdmTrace(input: FdmTraceResolveInput): FdmResolvedTrace {
  return {
    sourceLabel: resolveFdmSourceLabel({
      selectedJobId: input.selectedJobId,
      selectedJobName: input.selectedJobName,
    }),
    sourceFingerprint: resolveFdmLegacyComparisonSourceFingerprint({
      telemetryDigest: input.telemetryDigest,
      jobSliceInputMeta: input.jobSliceInputMeta,
      jobLegacyDebug: input.jobLegacyDebug,
    }),
  }
}
