// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  gripBaselineFixturesPresent,
  loadGripBaselineStlPairFromDisk,
} from '@/core/raster/rasterGripBaselineLoader.node'
import { RASTER_TRACING_GRIP_SAMPLE_COUNTS } from '@/core/raster/rasterTracingDepthGolden'
import {
  RASTER_GRIP_STL_CPU_Z_SHA256,
  traceGripRectOnTerrainGrid,
} from '@/core/raster/rasterGripStlCpuTracing'

const fixturesPresent = gripBaselineFixturesPresent()

describe.skipIf(!fixturesPresent)('rasterGripStlCpuTracing.integration', () => {
  it(
    'synced grip terrain.stl supports rect CPU tracing with pinned Z SHA',
    () => {
      const { terrainTriangles, meshMatch } = loadGripBaselineStlPairFromDisk()
      expect(meshMatch).toBe(true)
      const r = traceGripRectOnTerrainGrid(terrainTriangles)
      expect(r.pointCount).toBe(RASTER_TRACING_GRIP_SAMPLE_COUNTS.step2)
      expect(r.sha256).toBe(RASTER_GRIP_STL_CPU_Z_SHA256)
    },
    120_000,
  )
})
