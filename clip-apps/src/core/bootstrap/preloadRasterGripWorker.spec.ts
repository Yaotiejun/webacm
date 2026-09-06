import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPreloadRasterGripWorkerForTests, preloadRasterGripWorker } from './preloadRasterGripWorker'

describe('preloadRasterGripWorker', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetPreloadRasterGripWorkerForTests()
  })

  it('no-ops when grip bridge disabled', () => {
    vi.stubEnv('VITE_RASTER_GRIP_BRIDGE', '0')
    expect(() => preloadRasterGripWorker()).not.toThrow()
  })
})
