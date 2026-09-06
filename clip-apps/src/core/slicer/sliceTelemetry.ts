import type { SliceResult } from '@/api/slice'

export interface SliceFallbackTelemetryEvent {
  kind: 'slicer_fallback'
  code: string
  reasonCode: NonNullable<SliceResult['fallback']>['reasonCode']
  message: string
}

export function buildSliceFallbackTelemetryEvent(
  fallback: SliceResult['fallback'],
): SliceFallbackTelemetryEvent | null {
  if (!fallback) return null
  return {
    kind: 'slicer_fallback',
    code: fallback.warningCode || `slicer_${fallback.reasonCode}`,
    reasonCode: fallback.reasonCode,
    message: fallback.message,
  }
}
