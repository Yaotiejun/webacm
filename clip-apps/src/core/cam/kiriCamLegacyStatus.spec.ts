import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/core/cam/kiriCamRuntime', () => ({
  getKiriCamLegacyHealth: vi.fn(),
}))

import { getKiriCamLegacyHealth } from '@/core/cam/kiriCamRuntime'
import { formatKiriCamLegacyStatus } from './kiriCamLegacyStatus'

describe('formatKiriCamLegacyStatus', () => {
  beforeEach(() => {
    vi.mocked(getKiriCamLegacyHealth).mockReturnValue({
      ready: true,
      initErrorMessage: null,
      hasSlice: true,
      hasExport: true,
      legacyImportErrorMessage: null,
    })
  })

  it('reports ready when slice and export load', () => {
    const s = formatKiriCamLegacyStatus()
    expect(s.readyForLegacyJob).toBe(true)
    expect(s.hintLevel).toBe('success')
    expect(s.label).toContain('kiri-cam')
  })

  it('warns when legacy disabled via env', () => {
    vi.stubEnv('VITE_KIRI_LEGACY_CAM', '0')
    try {
      const s = formatKiriCamLegacyStatus()
      expect(s.readyForLegacyJob).toBe(false)
      expect(s.label).toContain('VITE_KIRI_LEGACY_CAM=0')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
