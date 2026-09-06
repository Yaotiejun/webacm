import { describe, expect, it } from 'vitest'
import { evaluateMigrationOrderedPipeline } from './migrationOrderedPipeline'

describe('migrationOrderedPipeline', () => {
  it('runs offline ordered phases 1-4', async () => {
    const prevCam = process.env.CAM_LIVE_MIGRATION
    const prevDev = process.env.DEVICE_PRODUCTION_SOAK
    delete process.env.CAM_LIVE_MIGRATION
    delete process.env.DEVICE_PRODUCTION_SOAK

    const r = await evaluateMigrationOrderedPipeline()
    if (prevCam != null) process.env.CAM_LIVE_MIGRATION = prevCam
    if (prevDev != null) process.env.DEVICE_PRODUCTION_SOAK = prevDev

    expect(r.phases.map((p) => p.id)).toEqual([
      'cam-live',
      'device-soak',
      'fdm-legacy',
      'raster-e2e',
    ])
    const failed = r.phases.filter((p) => !p.ok)
    expect(failed, failed.flatMap((p) => `${p.id}: ${p.errors.join('; ')}`).join(' | ')).toEqual([])
  })
})
