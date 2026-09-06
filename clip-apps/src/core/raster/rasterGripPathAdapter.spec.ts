import { describe, expect, it } from 'vitest'
import { gripPlanarToolpathToRasterPaths } from './rasterGripPathAdapter'

describe('gripPlanarToolpathToRasterPaths', () => {
  it('maps row-major Z grid to world XY scanlines', () => {
    const pathData = new Float32Array([1, 2, 3, 4])
    const paths = gripPlanarToolpathToRasterPaths({
      pathData,
      numScanlines: 2,
      pointsPerLine: 2,
      terrainBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      gridStep: 0.1,
      xStep: 1,
      yStep: 1,
      zFloor: -100,
    })
    expect(paths).toHaveLength(2)
    expect(paths[0]?.points[0]).toEqual([0, 0, 1])
    expect(paths[1]?.points[1]).toEqual([0.1, 0.1, 4])
  })
})
