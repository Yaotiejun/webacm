import type { SliceResult } from '@/api/slice'
import {
  TRACE_NONE_VALUE,
  TRACE_SCHEMA_VERSION,
  TRACE_SCHEMA_VERSION_KEY,
  TRACE_SOURCE_FINGERPRINT_KEY,
  TRACE_SOURCE_LABEL_KEY,
} from '@/core/traceKeys'

export interface EstimateMetaExportContext {
  device: string
  process: string
  material: string
  jobId?: string | null
  jobName?: string | null
  sourceLabel?: string | null
  sourceFingerprint?: string | null
}

export interface EstimateMetaExportPayload {
  timestamp: string
  fingerprint: string
  job: {
    id: string | null
    name: string | null
  }
  current: {
    device: string
    process: string
    material: string
  }
  trace: {
    traceSchemaVersion: number
    sourceLabel: string
    sourceFingerprint: string
  }
  backend: string
  fallback: SliceResult['fallback']
  estimateMeta: NonNullable<NonNullable<SliceResult['summary']>['estimateMeta']>
}

export function buildEstimateMetaCompactSummary(result: SliceResult, context: EstimateMetaExportContext): string {
  const meta = result.summary.estimateMeta
  if (!meta) return ''
  const backend = result.backend || 'mock'
  const fallback = result.fallback?.reasonCode || 'none'
  const jobName = context.jobName || 'none'
  return [
    `[FDM estimate]`,
    `job=${jobName}`,
    `device=${context.device}`,
    `process=${context.process}`,
    `material=${context.material}`,
    `backend=${backend}`,
    `fallback=${fallback}`,
    `layers=${result.summary.layers}`,
    `timeMin=${result.summary.timeMinutes.toFixed(3)}`,
    `filamentMm=${result.summary.filamentMm.toFixed(3)}`,
    `lenP=${meta.lengths.perimeter.toFixed(2)}`,
    `lenI=${meta.lengths.infill.toFixed(2)}`,
    `lenS=${meta.lengths.support.toFixed(2)}`,
    `travel=${meta.lengths.travelInLayer.toFixed(2)}/${meta.lengths.travelInterLayer.toFixed(2)}`,
    `ret=${meta.retract.estimatedCount}`,
    `finalSec=${meta.timeSec.final.toFixed(2)}`,
  ].join(' | ')
}

export function buildEstimateMetaFingerprint(result: SliceResult, context: EstimateMetaExportContext): string {
  const meta = result.summary.estimateMeta
  if (!meta) return ''
  return [
    `device:${context.device}`,
    `process:${context.process}`,
    `material:${context.material}`,
    `backend:${result.backend || 'mock'}`,
    `fallback:${result.fallback?.reasonCode || 'none'}`,
    `layers:${result.summary.layers}`,
    `time:${result.summary.timeMinutes.toFixed(3)}`,
    `filament:${result.summary.filamentMm.toFixed(3)}`,
    `lenP:${meta.lengths.perimeter.toFixed(3)}`,
    `lenI:${meta.lengths.infill.toFixed(3)}`,
    `lenS:${meta.lengths.support.toFixed(3)}`,
    `lenTi:${meta.lengths.travelInLayer.toFixed(3)}`,
    `lenTz:${meta.lengths.travelInterLayer.toFixed(3)}`,
    `ret:${meta.retract.estimatedCount}`,
    `final:${meta.timeSec.final.toFixed(3)}`,
  ].join('|')
}

export function buildEstimateMetaExportPayload(
  result: SliceResult,
  context: EstimateMetaExportContext
): EstimateMetaExportPayload | null {
  const meta = result.summary.estimateMeta
  if (!meta) return null
  return {
    timestamp: new Date().toISOString(),
    fingerprint: buildEstimateMetaFingerprint(result, context),
    job: {
      id: context.jobId ?? null,
      name: context.jobName ?? null,
    },
    current: {
      device: context.device,
      process: context.process,
      material: context.material,
    },
    trace: {
      [TRACE_SCHEMA_VERSION_KEY]: TRACE_SCHEMA_VERSION,
      [TRACE_SOURCE_LABEL_KEY]: context.sourceLabel ?? TRACE_NONE_VALUE,
      [TRACE_SOURCE_FINGERPRINT_KEY]: context.sourceFingerprint ?? TRACE_NONE_VALUE,
    },
    backend: result.backend || 'mock',
    fallback: result.fallback || null,
    estimateMeta: meta,
  }
}
