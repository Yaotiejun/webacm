import { gripBaselineFixturesPresent } from '@/core/raster/rasterGripBaselineLoader.node'
import {
  RASTER_GRIP_STL_CPU_Z_SHA256,
  traceGripRectOnTerrainGrid,
} from '@/core/raster/rasterGripStlCpuTracing'
import {
  gripRectTracingPathAtStep,
  RASTER_TRACING_GRIP_RECT_PATH_SHA256,
  RASTER_TRACING_GRIP_RECT_PATH_STEP05_SHA256,
  RASTER_TRACING_GRIP_RECT_PATH_STEP2_SHA256,
  sha256GripTracingPathXY,
} from '@/core/raster/rasterTracingGripRectPathGolden'
import { RASTER_TRACING_GRIP_SAMPLE_COUNTS } from '@/core/raster/rasterTracingDepthGolden'
import {
  RASTER_TRACING_GRIP_RECT_CPU_Z,
  traceGripRectCpuZOnFlatTerrain,
} from '@/core/raster/rasterTracingRectCpuZGolden'
import { loadGripBaselineStlPairFromDisk } from '@/core/raster/rasterGripBaselineLoader.node'

export interface RasterMigrationCompleteResult {
  ok: boolean
  checks: {
    gripPathSha: boolean
    flatCpuZ: boolean
    stlTerrainPin: boolean | 'skipped'
  }
  errors: string[]
}

/** Migration gate: grip path + flat CPU Z + optional synced STL terrain pin. */
export function evaluateRasterMigrationComplete(): RasterMigrationCompleteResult {
  const errors: string[] = []

  const pathOk =
    sha256GripTracingPathXY(gripRectTracingPathAtStep(0.5)) ===
      RASTER_TRACING_GRIP_RECT_PATH_STEP05_SHA256 &&
    sha256GripTracingPathXY(gripRectTracingPathAtStep(1)) === RASTER_TRACING_GRIP_RECT_PATH_SHA256 &&
    sha256GripTracingPathXY(gripRectTracingPathAtStep(2)) === RASTER_TRACING_GRIP_RECT_PATH_STEP2_SHA256 &&
    gripRectTracingPathAtStep(1).length === RASTER_TRACING_GRIP_SAMPLE_COUNTS.step1
  if (!pathOk) errors.push('grip rect samplePath SHA mismatch')

  const flat = traceGripRectCpuZOnFlatTerrain(1)
  const flatOk =
    flat.pointCount === RASTER_TRACING_GRIP_RECT_CPU_Z.pointCount &&
    flat.sha256 === RASTER_TRACING_GRIP_RECT_CPU_Z.sha256
  if (!flatOk) errors.push('flat terrain CPU Z SHA mismatch')

  let stlTerrainPin: boolean | 'skipped' = 'skipped'
  if (gripBaselineFixturesPresent()) {
    const { terrainTriangles, meshMatch } = loadGripBaselineStlPairFromDisk()
    if (!meshMatch) errors.push('grip baseline STL mesh sizes mismatch')
    const stl = traceGripRectOnTerrainGrid(terrainTriangles)
    stlTerrainPin =
      stl.sha256 === RASTER_GRIP_STL_CPU_Z_SHA256 &&
      stl.pointCount === RASTER_TRACING_GRIP_SAMPLE_COUNTS.step2
    if (!stlTerrainPin) errors.push('terrain.stl CPU tracing SHA mismatch')
  }

  return {
    ok: errors.length === 0,
    checks: {
      gripPathSha: pathOk,
      flatCpuZ: flatOk,
      stlTerrainPin,
    },
    errors,
  }
}
