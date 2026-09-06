import { createHash } from 'node:crypto'
import { sampleTracingPathGripStep } from '@/core/raster/rasterGripTracingSamplePath'
import { traceSampledPathCpuDepths } from '@/core/raster/rasterTracingCpuDepth'
import { RASTER_TRACING_GOLDEN_RECT } from '@/core/raster/rasterTracingDepthGolden'
import {
  RASTER_TRACING_FLAT_BOUNDS,
  RASTER_TRACING_FLAT_TERRAIN,
  RASTER_TRACING_UNIT_TOOL,
} from '@/core/raster/rasterTracingCpuDepthGolden'

/** Pinned grip `samplePath` + CPU collision Z on flat terrain (step=1, 81 points). */
export const RASTER_TRACING_GRIP_RECT_CPU_Z = Object.freeze({
  pointCount: 81,
  sha256: '4a67696f6e6eb0008348d3b26369a7116e3eaff11aabffbd5e9d05a05885c8af',
})

export function sha256Float32Z(values: ReadonlyArray<number>): string {
  const buf = new Float32Array(values)
  return createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex')
}

export function traceGripRectCpuZOnFlatTerrain(tracingStep = 1): {
  pointCount: number
  sha256: string
} {
  const sampled = sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, tracingStep)
  const depths = traceSampledPathCpuDepths(
    sampled,
    RASTER_TRACING_FLAT_TERRAIN,
    RASTER_TRACING_UNIT_TOOL,
    RASTER_TRACING_FLAT_BOUNDS,
    1,
    1,
    -100,
  )
  const z = depths.map((p) => p[2]!)
  return { pointCount: z.length, sha256: sha256Float32Z(z) }
}
