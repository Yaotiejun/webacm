// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  isRasterTracingWebGpuAvailable,
  runRasterTracingGpuCpuParity,
} from '@/core/raster/rasterTracingGpu'
import {
  RASTER_TRACING_FLAT_BOUNDS,
  RASTER_TRACING_FLAT_TERRAIN,
  RASTER_TRACING_UNIT_TOOL,
} from '@/core/raster/rasterTracingCpuDepthGolden'

const SQUARE: Array<[number, number]> = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [0, 0],
]

describe('rasterTracingWebgpu.integration', () => {
  it.skipIf(!isRasterTracingWebGpuAvailable())(
    'gpu tracing shader matches cpu sampleAt on flat terrain',
    async () => {
      const r = await runRasterTracingGpuCpuParity({
        sampledXY: SQUARE,
        terrain: RASTER_TRACING_FLAT_TERRAIN,
        tool: RASTER_TRACING_UNIT_TOOL,
        bounds: RASTER_TRACING_FLAT_BOUNDS,
        resolution: 1,
        zFloor: -100,
        stepX: 1,
        stepY: 1,
      })
      expect(r.usedGpu).toBe(true)
      expect(r.pointCount).toBe(5)
      expect(r.maxDelta).toBeLessThan(1e-4)
    },
    30_000,
  )
})
