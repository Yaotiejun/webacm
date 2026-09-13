import { describe, expect, it } from 'vitest'
import { rasterConfigWithGripPreset, GRIP_RASTER_RADIAL_BASELINE } from './rasterGripPresets'

describe('raster radialV3 config', () => {
  it('can enable radialV3 on radial baseline', () => {
    const cfg = rasterConfigWithGripPreset(GRIP_RASTER_RADIAL_BASELINE, { radialV3: true })
    expect(cfg.mode).toBe('radial')
    expect(cfg.radialV3).toBe(true)
  })
})
