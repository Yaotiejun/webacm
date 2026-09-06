import type { CamFallbackReasonCode } from '@/types/camJob'

const FALLBACK_REASON_LABELS: Record<CamFallbackReasonCode, string> = {
  legacy_disabled: '已禁用 Legacy CAM',
  runtime_init_error: 'Legacy 运行时初始化失败',
  runtime_not_ready: 'Legacy 运行时未就绪',
  legacy_impl_missing_both: '缺少 Legacy slice/export 实现',
  legacy_impl_missing_slice: '缺少 Legacy slice 实现',
  legacy_impl_missing_export: '缺少 Legacy export 实现',
  legacy_unknown: 'Legacy 不可用（未知原因）',
}

export function getCamFallbackReasonLabel(code: CamFallbackReasonCode): string {
  return FALLBACK_REASON_LABELS[code] ?? code
}
