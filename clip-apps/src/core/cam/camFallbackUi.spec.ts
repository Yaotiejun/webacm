import { describe, expect, it } from 'vitest'
import type { CamFallbackReasonCode } from '@/types/camJob'
import { getCamFallbackReasonLabel } from './camFallbackUi'

const ALL_FALLBACK_CODES = [
  'legacy_disabled',
  'runtime_init_error',
  'runtime_not_ready',
  'legacy_impl_missing_both',
  'legacy_impl_missing_slice',
  'legacy_impl_missing_export',
  'legacy_unknown',
] as const satisfies readonly CamFallbackReasonCode[]

describe('cam.camFallbackUi', () => {
  it('maps fallback reason code to Chinese label', () => {
    expect(getCamFallbackReasonLabel('legacy_disabled')).toBe('已禁用 Legacy CAM')
    expect(getCamFallbackReasonLabel('runtime_init_error')).toContain('初始化失败')
  })

  it('labels every CamFallbackReasonCode with a dedicated non-empty string', () => {
    for (const code of ALL_FALLBACK_CODES) {
      const label = getCamFallbackReasonLabel(code)
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toBe(code)
    }
  })
})
