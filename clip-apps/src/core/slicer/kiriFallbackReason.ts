import type { SliceResult } from '@/api/slice'
import { attachWarningCodeToFallback } from './kiriFallbackDecision'

export function resolveKiriFallbackReason(input: { err: unknown; legacyFdmMode: string }): {
  reasonCode: NonNullable<SliceResult['fallback']>['reasonCode']
  warningCode?: `slicer_${string}`
  message: string
} {
  const msg = input.err instanceof Error ? input.err.message : String(input.err ?? 'unknown error')
  if (input.legacyFdmMode === '0') {
    return attachWarningCodeToFallback({
      reasonCode: 'legacy_disabled',
      message: 'legacy FDM disabled by VITE_KIRI_LEGACY_FDM=0',
    })
  }
  if (msg.includes('runtime init failed')) {
    return attachWarningCodeToFallback({ reasonCode: 'runtime_init_error', message: msg })
  }
  if (msg.includes('runtime not ready')) {
    return attachWarningCodeToFallback({ reasonCode: 'runtime_not_ready', message: msg })
  }
  if (msg.includes('already running')) {
    return attachWarningCodeToFallback({ reasonCode: 'legacy_slice_reentry', message: msg })
  }
  if (msg.includes('timeout')) {
    return attachWarningCodeToFallback({ reasonCode: 'legacy_slice_timeout', message: msg })
  }
  if (msg.includes('implementation missing')) {
    return attachWarningCodeToFallback({ reasonCode: 'legacy_impl_missing', message: msg })
  }
  return attachWarningCodeToFallback({ reasonCode: 'legacy_slice_failed', message: msg })
}
