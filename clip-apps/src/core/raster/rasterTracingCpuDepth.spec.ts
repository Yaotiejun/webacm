import { describe, expect, it } from 'vitest'
import {
  computeRasterTracingCollisionZ,
  maxRasterTracingDepthDelta,
  traceSampledPathCpuDepths,
} from './rasterTracingCpuDepth'
import {
  RASTER_TRACING_CPU_DEPTH_GOLDEN,
  RASTER_TRACING_FLAT_BOUNDS,
  RASTER_TRACING_FLAT_TERRAIN,
  RASTER_TRACING_UNIT_TOOL,
} from './rasterTracingCpuDepthGolden'

describe('rasterTracingCpuDepth', () => {
  it('flat terrain collision Z matches pinned golden', () => {
    const g = RASTER_TRACING_CPU_DEPTH_GOLDEN
    const z = computeRasterTracingCollisionZ(
      1,
      1,
      RASTER_TRACING_FLAT_TERRAIN,
      RASTER_TRACING_UNIT_TOOL,
      RASTER_TRACING_FLAT_BOUNDS,
      1,
      1,
      -100,
    )
    expect(z).toBe(g.flatCenterZ)
  })

  it('traceSampledPathCpuDepths on unit square matches flat terrain collision', () => {
    const g = RASTER_TRACING_CPU_DEPTH_GOLDEN
    const square: Array<[number, number]> = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]
    const depths = traceSampledPathCpuDepths(
      square,
      RASTER_TRACING_FLAT_TERRAIN,
      RASTER_TRACING_UNIT_TOOL,
      RASTER_TRACING_FLAT_BOUNDS,
      1,
      1,
      -100,
    )
    expect(depths[0]![2]).toBe(g.rectOriginZ)
    expect(depths.every((p) => p[2] === 0)).toBe(true)
  })

  it('maxRasterTracingDepthDelta is zero for identical paths', () => {
    const a: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, 0, 0],
    ]
    expect(maxRasterTracingDepthDelta(a, a)).toBe(0)
    expect(maxRasterTracingDepthDelta(a, [[0, 0, 0.001], [1, 0, 0]])).toBeCloseTo(0.001, 6)
  })
})
