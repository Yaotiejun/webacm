import { createHash } from 'node:crypto'
import { sampleTracingPathGripStep } from '@/core/raster/rasterGripTracingSamplePath'
import { RASTER_TRACING_GOLDEN_RECT } from '@/core/raster/rasterTracingDepthGolden'

/** Pinned grip `samplePath` XY polyline (step=1, 81 points) for tracing regression. */
export const RASTER_TRACING_GRIP_RECT_PATH_SHA256 =
  '7687355f870b59acc5dfe9b79ba570b115b33e559c729142ad4c9d75a3050384'

/** Pinned grip `samplePath` XY polyline (step=2, 41 points). */
export const RASTER_TRACING_GRIP_RECT_PATH_STEP2_SHA256 =
  '81c9a069fdd1eb4bd2f1bd71dbc74d4c86ab61c2e21eab70289bab6ee4cec551'

/** Pinned grip `samplePath` XY polyline (step=0.5, 161 points). */
export const RASTER_TRACING_GRIP_RECT_PATH_STEP05_SHA256 =
  '0406228c4659790a2dd66d960df9cc6c75c87871b4ae9dfa6a6eb2bcd66a5535'

export function sha256GripTracingPathXY(
  points: ReadonlyArray<readonly [number, number]>,
): string {
  const buf = new Float64Array(points.length * 2)
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i]!
    buf[i * 2] = p[0]
    buf[i * 2 + 1] = p[1]
  }
  return createHash('sha256').update(Buffer.from(buf.buffer)).digest('hex')
}

export function gripRectTracingPathAtStep(tracingStep: number) {
  return sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, tracingStep)
}
