import { beforeEach, describe, expect, it, vi } from 'vitest'

const camInit = vi.fn().mockResolvedValue(undefined)
const fdmPreload = vi.fn().mockResolvedValue(undefined)

vi.mock('@/core/cam/kiriCamRuntime', () => ({
  kiriCamRuntime: { init: camInit },
}))

vi.mock('@/core/slicer/kiriEngine', () => ({
  preloadKiriFdmRuntime: fdmPreload,
}))

describe('preloadLegacyRuntimes', () => {
  beforeEach(() => {
    camInit.mockClear()
    fdmPreload.mockClear()
    vi.unstubAllEnvs()
  })

  it('starts CAM and FDM preload when legacy modes are enabled', async () => {
    vi.stubEnv('VITE_KIRI_LEGACY_CAM', 'auto')
    vi.stubEnv('VITE_KIRI_LEGACY_FDM', 'auto')
    const { preloadLegacyRuntimes } = await import('./preloadLegacyRuntimes')
    preloadLegacyRuntimes()
    await Promise.resolve()
    expect(camInit).toHaveBeenCalled()
    expect(fdmPreload).toHaveBeenCalled()
  })

  it('skips CAM when VITE_KIRI_LEGACY_CAM=0', async () => {
    vi.stubEnv('VITE_KIRI_LEGACY_CAM', '0')
    vi.stubEnv('VITE_KIRI_LEGACY_FDM', 'auto')
    const { preloadLegacyRuntimes } = await import('./preloadLegacyRuntimes')
    preloadLegacyRuntimes()
    await Promise.resolve()
    expect(camInit).not.toHaveBeenCalled()
    expect(fdmPreload).toHaveBeenCalled()
  })

  it('skips FDM when VITE_KIRI_LEGACY_FDM=0', async () => {
    vi.stubEnv('VITE_KIRI_LEGACY_CAM', '1')
    vi.stubEnv('VITE_KIRI_LEGACY_FDM', '0')
    const { preloadLegacyRuntimes } = await import('./preloadLegacyRuntimes')
    preloadLegacyRuntimes()
    await Promise.resolve()
    expect(camInit).toHaveBeenCalled()
    expect(fdmPreload).not.toHaveBeenCalled()
  })
})
