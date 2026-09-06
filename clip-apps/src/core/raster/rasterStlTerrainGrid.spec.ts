// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { calcBoundsFromStlTriangles } from '@/core/raster/rasterStlBounds'
import { rasterizeTerrainZGridFromTriangles } from '@/core/raster/rasterStlTerrainGrid'
import { traceSampledPathCpuDepths } from '@/core/raster/rasterTracingCpuDepth'
import { RASTER_TRACING_UNIT_TOOL } from '@/core/raster/rasterTracingCpuDepthGolden'

describe('rasterStlTerrainGrid', () => {
  it('rasterizes a sloped triangle patch for CPU tracing', () => {
    const triangles = new Float32Array([
      0, 0, 0, 10, 0, 0, 0, 10, 5,
    ])
    const bounds = calcBoundsFromStlTriangles(triangles)
    const terrain = rasterizeTerrainZGridFromTriangles(triangles, bounds, 1)
    expect(terrain.width).toBeGreaterThan(0)
    const depths = traceSampledPathCpuDepths(
      [[5, 5]],
      terrain,
      RASTER_TRACING_UNIT_TOOL,
      bounds,
      1,
      1,
      -100,
    )
    expect(depths[0]![2]).toBeGreaterThan(-100)
    expect(depths[0]![2]).toBeLessThanOrEqual(5)
  })
})
