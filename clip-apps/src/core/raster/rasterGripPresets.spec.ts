import { describe, expect, it } from 'vitest'
import {
  GRIP_RASTER_PLANAR_BASELINE,
  GRIP_RASTER_RADIAL_BASELINE,
  buildGripPlanarBaselineRasterRequest,
  buildGripRadialBaselineRasterRequest,
  rasterConfigWithGripPreset,
} from './rasterGripPresets'

describe('rasterGripPresets', () => {
  it('matches grip planar-baseline parameters', () => {
    expect(GRIP_RASTER_PLANAR_BASELINE.resolution).toBe(0.05)
    expect(GRIP_RASTER_PLANAR_BASELINE.xStep).toBe(1)
    expect(GRIP_RASTER_PLANAR_BASELINE.yStep).toBe(1)
    expect(GRIP_RASTER_PLANAR_BASELINE.zFloor).toBe(-100)
  })

  it('merges optional patch', () => {
    const c = rasterConfigWithGripPreset(GRIP_RASTER_PLANAR_BASELINE, { xStep: 2 })
    expect(c.xStep).toBe(2)
    expect(c.resolution).toBe(0.05)
  })

  it('matches grip radial-baseline parameters', () => {
    expect(GRIP_RASTER_RADIAL_BASELINE.mode).toBe('radial')
    expect(GRIP_RASTER_RADIAL_BASELINE.resolution).toBe(0.1)
    expect(GRIP_RASTER_RADIAL_BASELINE.rotationStep).toBe(1)
    expect(GRIP_RASTER_RADIAL_BASELINE.zFloor).toBe(0)
  })

  it('builds planar baseline request', () => {
    const terrain = new Float32Array(9)
    const tool = new Float32Array(9)
    const req = buildGripPlanarBaselineRasterRequest(terrain, tool)
    expect(req.config.mode).toBe('planar')
    expect(req.config.resolution).toBe(0.05)
    expect(req.terrainTriangles).toBe(terrain)
  })

  it('builds radial baseline request', () => {
    const req = buildGripRadialBaselineRasterRequest(new Float32Array(9), new Float32Array(9))
    expect(req.config.mode).toBe('radial')
    expect(req.config.rotationStep).toBe(1)
  })
})
