import { describe, expect, it } from 'vitest'
import type { SliceFallbackReasonCode } from '@/api/slice'
import { getSliceFallbackReasonLabel, getSliceFallbackWarningLabel } from './sliceFallbackUi'

const ALL_SLICE_FALLBACK_CODES = [
  'legacy_disabled',
  'runtime_init_error',
  'runtime_not_ready',
  'legacy_impl_missing',
  'legacy_slice_timeout',
  'legacy_slice_reentry',
  'legacy_slice_failed',
] as const satisfies readonly SliceFallbackReasonCode[]

describe('slicer.sliceFallbackUi', () => {
  it('maps fallback reason code to Chinese label', () => {
    expect(getSliceFallbackReasonLabel('legacy_disabled')).toBe('已禁用 Legacy FDM')
    expect(getSliceFallbackReasonLabel('runtime_init_error')).toContain('初始化失败')
    expect(getSliceFallbackReasonLabel('legacy_slice_timeout')).toContain('超时')
    expect(getSliceFallbackReasonLabel('legacy_slice_reentry')).toContain('重入')
  })

  it('labels every SliceFallbackReasonCode with a dedicated non-empty string', () => {
    for (const code of ALL_SLICE_FALLBACK_CODES) {
      const label = getSliceFallbackReasonLabel(code)
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toBe(code)
    }
  })

  it('maps fallback payload to warning label', () => {
    expect(
      getSliceFallbackWarningLabel({
        reasonCode: 'legacy_slice_timeout',
        warningCode: 'slicer_legacy_slice_timeout',
        message: 'legacy slice timeout after 500ms',
      }),
    ).toContain('超时')
  })

  it('getSliceFallbackWarningLabel returns empty when fallback is absent', () => {
    expect(getSliceFallbackWarningLabel(null)).toBe('')
    expect(getSliceFallbackWarningLabel(undefined)).toBe('')
  })
})
