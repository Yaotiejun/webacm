import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CamJobInputGeometry, CamProfile } from '@/types/camJob'

const hoisted = vi.hoisted(() => ({
  runCamJob: vi.fn(() =>
    Promise.resolve({
      backend: 'cam-placeholder',
      deviceName: 'd',
      processName: 'p',
      profileName: null,
      stockSize: null,
      zSettings: { anchor: null, bottom: null, clearance: null },
      summary: {
        opCount: 0,
        toolCountUsed: 0,
        estimatedTotalPasses: 0,
        estimatedTotalPathSegments: 0,
        estimatedMachiningTimeMinutes: 0,
      },
      perOp: [],
      notes: [],
      legacyDebug: undefined,
      fallback: null,
    }),
  ),
}))

vi.mock('@/core/cam/camEngine', () => ({
  runCamJob: hoisted.runCamJob,
}))

import { runCamJob, simulateCamJob } from './cam'

function minimalProfile(): CamProfile {
  return {
    device: { deviceName: 'd0' } as CamProfile['device'],
    tools: [],
    process: { processName: 'p0', ops: [] } as CamProfile['process'],
  }
}

function minimalGeometry(): CamJobInputGeometry {
  return {
    id: 'g0',
    bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
  }
}

describe('api.cam.runCamJob', () => {
  it('re-exports core runCamJob', async () => {
    const profile = minimalProfile()
    const geometry = minimalGeometry()
    await runCamJob(profile, geometry)
    expect(hoisted.runCamJob).toHaveBeenCalledWith(profile, geometry)
  })
})

describe('api.cam.simulateCamJob (deprecated alias)', () => {
  beforeEach(() => {
    hoisted.runCamJob.mockClear()
  })

  it('delegates to runCamJob with devMode from import.meta.env.DEV', async () => {
    const profile = minimalProfile()
    const geometry = minimalGeometry()
    await simulateCamJob(profile, geometry)
    expect(hoisted.runCamJob).toHaveBeenCalledTimes(1)
    expect(hoisted.runCamJob).toHaveBeenCalledWith(profile, geometry, { devMode: import.meta.env.DEV })
  })
})
