export type LegacyFdmMode = '0' | '1' | 'auto'

export function resolveLegacyFdmMode(raw: unknown): LegacyFdmMode {
  const v = String(raw ?? 'auto')
  if (v === '0' || v === '1') return v
  return 'auto'
}

export function shouldTryLegacyFdm(mode: LegacyFdmMode): boolean {
  return mode !== '0'
}

export function shouldThrowOnLegacyImportFailure(mode: LegacyFdmMode): boolean {
  return mode === '1'
}

export function canRunLegacyFdmPreview(input: {
  runtimeReady: boolean
  runtimeError: Error | null
  hasSliceImpl: boolean
  hasVertices: boolean
}): boolean {
  return input.runtimeReady && !input.runtimeError && input.hasSliceImpl && input.hasVertices
}

export function resolveLegacyPreviewSkipFallback(input: {
  mode: LegacyFdmMode
  runtimeReady: boolean
  runtimeError: Error | null
  hasSliceImpl: boolean
  hasVertices: boolean
}): { reasonCode: 'legacy_disabled' | 'runtime_init_error' | 'runtime_not_ready' | 'legacy_impl_missing'; message: string } | null {
  if (input.mode === '0') return { reasonCode: 'legacy_disabled', message: 'legacy fdm disabled by policy' }
  if (!input.hasVertices) return null
  if (input.runtimeError) return { reasonCode: 'runtime_init_error', message: input.runtimeError.message || 'runtime init error' }
  if (!input.runtimeReady) return { reasonCode: 'runtime_not_ready', message: 'runtime not ready' }
  if (!input.hasSliceImpl) return { reasonCode: 'legacy_impl_missing', message: 'legacy slice implementation missing' }
  return null
}

export function resolveLegacySliceTimeoutMs(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 30_000
  return Math.max(100, Math.min(300_000, Math.round(n)))
}

export type LegacySliceFailureCode = 'legacy_slice_reentry' | 'legacy_slice_timeout' | 'legacy_slice_failed'

export function resolveLegacySliceFailureCode(err: unknown): LegacySliceFailureCode {
  const msg = String((err as any)?.message ?? err ?? '')
  if (msg.includes('already running')) return 'legacy_slice_reentry'
  if (msg.includes('timeout')) return 'legacy_slice_timeout'
  return 'legacy_slice_failed'
}

export function toSliceFallbackReasonCode(code: LegacySliceFailureCode) {
  if (code === 'legacy_slice_reentry') return 'legacy_slice_reentry' as const
  if (code === 'legacy_slice_timeout') return 'legacy_slice_timeout' as const
  return 'legacy_slice_failed' as const
}
