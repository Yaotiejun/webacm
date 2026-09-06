/**
 * @vitest-environment node
 * Live grip terrain STL CPU tracing at grip planar resolution (0.05).
 *
 *   npm run sync:grip-fixtures
 *   $env:RASTER_GRIP_GOLDEN=1; npx vitest run src/core/raster/rasterGripStlTracing.live.spec.ts
 */
import { describe, expect, it } from 'vitest'
import {
  gripBaselineFixturesPresent,
  loadGripBaselineStlPairFromDisk,
} from '@/core/raster/rasterGripBaselineLoader.node'
import { traceGripRectOnTerrainGrid } from '@/core/raster/rasterGripStlCpuTracing'

const golden = process.env.RASTER_GRIP_GOLDEN === '1'
const canRun = golden && gripBaselineFixturesPresent()

describe.skipIf(!canRun)('rasterGripStlTracing.live', () => {
  it(
    'terrain.stl rect CPU trace at resolution 0.05 is stable',
    () => {
      const { terrainTriangles } = loadGripBaselineStlPairFromDisk()
      const a = traceGripRectOnTerrainGrid(terrainTriangles, 2, 0.05)
      const b = traceGripRectOnTerrainGrid(terrainTriangles, 2, 0.05)
      expect(a.sha256).toBe(b.sha256)
      expect(a.pointCount).toBe(b.pointCount)
    },
    300_000,
  )
})
