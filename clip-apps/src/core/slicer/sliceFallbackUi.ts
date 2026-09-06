import type { SliceFallbackReasonCode } from '@/api/slice'
import type { SliceResult } from '@/api/slice'

const SLICE_FALLBACK_REASON_LABELS: Record<SliceFallbackReasonCode, string> = {
  legacy_disabled: '已禁用 Legacy FDM',
  runtime_init_error: 'Legacy 运行时初始化失败',
  runtime_not_ready: 'Legacy 运行时未就绪',
  legacy_impl_missing: '缺少 Legacy slice 实现',
  legacy_slice_timeout: 'Legacy 切片超时',
  legacy_slice_reentry: 'Legacy 切片任务重入',
  legacy_slice_failed: 'Legacy 切片执行失败',
}

export function getSliceFallbackReasonLabel(code: SliceFallbackReasonCode): string {
  return SLICE_FALLBACK_REASON_LABELS[code] ?? code
}

export function getSliceFallbackWarningLabel(fallback: SliceResult['fallback']): string {
  if (!fallback) return ''
  return getSliceFallbackReasonLabel(fallback.reasonCode)
}
