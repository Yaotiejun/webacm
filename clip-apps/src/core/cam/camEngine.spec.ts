import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CamJobInputGeometry, CamProfile } from '@/types/camJob'

const rt = vi.hoisted(() => {
  const state = {
    camSliceImpl: null as ((_s: unknown, _w: unknown, _u: unknown, ondone: (err?: unknown) => void) => Promise<void>) | null,
    camExportImpl: null as ((_print: unknown, online: (chunk: unknown) => void) => unknown) | null,
  }
  return {
    state,
    kiriCamRuntime: {
      init: vi.fn(() => Promise.resolve()),
      isReady: () => true,
      getError: () => null as Error | null,
    },
    getKiriCamImpls: () => ({
      camSliceImpl: state.camSliceImpl,
      camExportImpl: state.camExportImpl,
    }),
    getKiriCamLegacyHealth: () => ({
      ready: true,
      initErrorMessage: null,
      hasSlice: typeof state.camSliceImpl === 'function',
      hasExport: typeof state.camExportImpl === 'function',
      legacyImportErrorMessage: null as string | null,
    }),
    __debugKiriCamRuntimeStatus: vi.fn(),
  }
})

vi.mock('@/core/cam/kiriCamRuntime', () => ({
  kiriCamRuntime: rt.kiriCamRuntime,
  getKiriCamImpls: rt.getKiriCamImpls,
  getKiriCamLegacyHealth: rt.getKiriCamLegacyHealth,
  __debugKiriCamRuntimeStatus: rt.__debugKiriCamRuntimeStatus,
}))

vi.mock('@/core/cam/camLegacyPrepare', () => ({
  runLegacyCamPrepare: vi.fn(async () => ({
    output: [[{ point: { x: 1, y: 0, z: 0 }, emit: 1, speed: 1000 }]],
  })),
}))

import { runCamJob } from '@/core/cam/camEngine'

function minimalProfile(): CamProfile {
  return {
    device: { deviceName: 'test-device' } as CamProfile['device'],
    tools: [],
    process: {
      processName: 'proc-a',
      ops: [{ type: 'rough', tool: 1, down: 1, step: 1, rate: 1000 }],
      camStockX: 10,
      camStockY: 10,
      camStockZ: 5,
    } as CamProfile['process'],
  }
}

function minimalGeometry(): CamJobInputGeometry {
  return {
    id: 'g1',
    bbox: { minX: 0, minY: 0, minZ: 0, maxX: 2, maxY: 2, maxZ: 1 },
    complexityHint: 1,
  }
}

describe('core.cam.camEngine runCamJob', () => {
  beforeEach(() => {
    rt.state.camSliceImpl = null
    rt.state.camExportImpl = null
    vi.mocked(rt.kiriCamRuntime.init).mockClear()
  })

  it('uses cam-placeholder when legacy slice is unavailable', async () => {
    const result = await runCamJob(minimalProfile(), minimalGeometry())
    expect(result.backend).toBe('cam-placeholder')
    expect(result.fallback).not.toBeNull()
    expect(result.fallback?.reasonCode).toBe('legacy_impl_missing_both')
    expect(result.notes.some((n) => n.includes('占位'))).toBe(true)
    expect(result.gcodeText).toContain('G1 X2.0000')
    expect(rt.kiriCamRuntime.init).toHaveBeenCalled()
    expect(result.legacyDebug).toEqual(
      expect.objectContaining({ ready: true, hasSlice: false, hasExport: false }),
    )
  })

  it('placeholder reports legacy_disabled when VITE_KIRI_LEGACY_CAM is 0', async () => {
    vi.stubEnv('VITE_KIRI_LEGACY_CAM', '0')
    try {
      const result = await runCamJob(minimalProfile(), minimalGeometry())
      expect(result.backend).toBe('cam-placeholder')
      expect(result.fallback?.reasonCode).toBe('legacy_disabled')
      expect(result.fallback?.message).toMatch(/VITE_KIRI_LEGACY_CAM=0/)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('kiri-cam-slice-only emits diagnostic stub when slice runs without cam_export', async () => {
    rt.state.camSliceImpl = async (_settings, _widget, _onupdate, ondone) => {
      ondone()
    }
    const result = await runCamJob(minimalProfile(), minimalGeometry())
    expect(result.backend).toBe('kiri-cam-slice-only')
    expect(result.gcodeText).toContain('Kiri CAM slice-only bridge')
    expect(result.notes.some((n) => n.includes('cam_export missing'))).toBe(true)
  })

  it('kiri-cam collects G-code when slice and cam_export are available', async () => {
    rt.state.camSliceImpl = async (_settings, _widget, _onupdate, ondone) => {
      ondone()
    }
    rt.state.camExportImpl = (_print, online) => {
      online('G1 X1')
      return undefined
    }
    const result = await runCamJob(minimalProfile(), minimalGeometry())
    expect(result.backend).toBe('kiri-cam')
    expect(result.gcodeText).toContain('G1 X1')
    expect(result.notes.some((n) => n.includes('legacy cam_export enabled'))).toBe(true)
  })
})
