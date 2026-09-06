import type { SliceResult } from '@/api/slice'
import {
  canRunLegacyFdmPreview,
  resolveLegacySliceFailureCode,
  resolveLegacyPreviewSkipFallback,
  toSliceFallbackReasonCode,
  type LegacyFdmMode,
} from './kiriRuntimePolicy'

export interface LegacyGateSnapshot {
  mode: LegacyFdmMode
  runtimeReady: boolean
  runtimeError: Error | null
  hasSliceImpl: boolean
  hasVertices: boolean
}

export function buildLegacyGateSnapshot(input: {
  mode: LegacyFdmMode
  runtimeReady: boolean
  runtimeError: Error | null
  hasSliceImpl: boolean
  hasVertices: boolean
}): LegacyGateSnapshot {
  return {
    mode: input.mode,
    runtimeReady: !!input.runtimeReady,
    runtimeError: input.runtimeError,
    hasSliceImpl: !!input.hasSliceImpl,
    hasVertices: !!input.hasVertices,
  }
}

export function resolveLegacyFallbackBeforeRun(gate: LegacyGateSnapshot): {
  shouldRunLegacy: boolean
  fallback: SliceResult['fallback']
} {
  const skipFallback = resolveLegacyPreviewSkipFallback(gate)
  if (skipFallback) return { shouldRunLegacy: false, fallback: attachWarningCodeToFallback(skipFallback) }
  return {
    shouldRunLegacy: canRunLegacyFdmPreview({
      runtimeReady: gate.runtimeReady,
      runtimeError: gate.runtimeError,
      hasSliceImpl: gate.hasSliceImpl,
      hasVertices: gate.hasVertices,
    }),
    fallback: null,
  }
}

export function resolveLegacyFallbackFromError(err: unknown): SliceResult['fallback'] {
  const code = resolveLegacySliceFailureCode(err)
  return attachWarningCodeToFallback({
    reasonCode: toSliceFallbackReasonCode(code),
    message: (err as any)?.message ?? String(err),
  })
}

export interface LegacyFailureTelemetry {
  fallback: NonNullable<SliceResult['fallback']>
  warningCode: string
}

export function resolveLegacyFailureTelemetry(err: unknown): LegacyFailureTelemetry {
  const fallback = resolveLegacyFallbackFromError(err)
  const reasonCode = fallback?.reasonCode || 'legacy_slice_failed'
  return {
    fallback: fallback || {
      reasonCode: 'legacy_slice_failed',
      warningCode: 'slicer_legacy_slice_failed',
      message: String((err as any)?.message ?? err ?? 'unknown error'),
    },
    warningCode: fallback?.warningCode || `slicer_${reasonCode}`,
  }
}

export function attachWarningCodeToFallback<T extends NonNullable<SliceResult['fallback']>>(fallback: T): T {
  return {
    ...fallback,
    warningCode: fallback.warningCode || (`slicer_${fallback.reasonCode}` as const),
  }
}
