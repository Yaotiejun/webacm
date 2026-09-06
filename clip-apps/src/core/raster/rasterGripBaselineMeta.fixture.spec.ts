import { describe, expect, it } from 'vitest'
import { GRIP_PLANAR_BASELINE_EXPECTATIONS } from './rasterGripBaselineExpectations'
import { GRIP_RASTER_PLANAR_BASELINE } from './rasterGripPresets'
import { validateGripPlanarBaselineMeta, type GripPlanarBaselineMetaFile } from './rasterGripBaselineMeta'

describe('rasterGripBaselineMeta.fixture', () => {
  it('validates canonical grip planar-baseline shape', () => {
    const e = GRIP_PLANAR_BASELINE_EXPECTATIONS
    const meta: GripPlanarBaselineMetaFile = {
      parameters: {
        mode: 'planar',
        resolution: GRIP_RASTER_PLANAR_BASELINE.resolution,
        xStep: 1,
        yStep: 1,
        zFloor: -100,
        terrainTriangles: e.terrainTriangles,
        toolTriangles: e.toolTriangles,
      },
      result: {
        terrainPoints: e.toolpathSize,
        toolpathSize: e.toolpathSize,
        numScanlines: e.numScanlines,
        pointsPerLine: e.pointsPerLine,
        checksum: e.checksum,
        sampleValues: ['-100.00'],
      },
    }
    expect(validateGripPlanarBaselineMeta(meta)).toEqual([])
  })
})
