import { describe, expect, it } from 'vitest'
import { GRIP_RASTER_FAST_DEV, GRIP_RASTER_PLANAR_BASELINE } from './rasterGripPresets'
import { isGripFastDevRasterConfig } from './rasterGripFastDevPolicy'

describe('isGripFastDevRasterConfig', () => {
  it('detects fast dev preset', () => {
    expect(isGripFastDevRasterConfig(GRIP_RASTER_FAST_DEV)).toBe(true)
  })

  it('rejects grip baseline', () => {
    expect(isGripFastDevRasterConfig(GRIP_RASTER_PLANAR_BASELINE)).toBe(false)
  })
})
