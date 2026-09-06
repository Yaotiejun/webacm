import { describe, expect, it } from 'vitest'
import { GRIP_PLANAR_BASELINE_EXPECTATIONS, GRIP_RADIAL_BASELINE_EXPECTATIONS } from './rasterGripBaselineExpectations'
import {
  buildGripPlanarBaselineShapedPaths,
  buildGripRadialBaselineShapedPaths,
  summarizeGripBaselinePaths,
} from './rasterGripBaselineShape'

describe('rasterGripBaselineShape', () => {
  it('planar shaped paths match grip scanline dimensions', () => {
    const paths = buildGripPlanarBaselineShapedPaths()
    const s = summarizeGripBaselinePaths(paths)
    const e = GRIP_PLANAR_BASELINE_EXPECTATIONS
    expect(s.pathCount).toBe(e.numScanlines)
    expect(s.pointCount).toBe(e.toolpathSize)
  })

  it('radial shaped paths match grip strip dimensions', () => {
    const paths = buildGripRadialBaselineShapedPaths()
    const s = summarizeGripBaselinePaths(paths)
    const e = GRIP_RADIAL_BASELINE_EXPECTATIONS
    expect(s.pathCount).toBe(e.numStrips)
    expect(s.pointCount).toBe(e.totalPoints)
  })
})
