import { describe, expect, it } from 'vitest'
import {
  GRIP_PLANAR_BASELINE_EXPECTATIONS,
  GRIP_RADIAL_BASELINE_EXPECTATIONS,
  gripPlanarBaselineHint,
  gripRadialBaselineHint,
} from './rasterGripBaselineExpectations'

describe('rasterGripBaselineExpectations', () => {
  it('matches grip planar-baseline.json checksum', () => {
    expect(GRIP_PLANAR_BASELINE_EXPECTATIONS.checksum).toBe(-838_563_865)
    expect(GRIP_PLANAR_BASELINE_EXPECTATIONS.numScanlines).toBe(1499)
  })

  it('matches grip radial-baseline.json checksum', () => {
    expect(GRIP_RADIAL_BASELINE_EXPECTATIONS.numStrips).toBe(360)
    expect(GRIP_RADIAL_BASELINE_EXPECTATIONS.checksum).toBe(312_526_634)
  })

  it('formats hints for UI', () => {
    expect(gripPlanarBaselineHint()).toContain('checksum')
    expect(gripRadialBaselineHint()).toContain('360')
  })
})
