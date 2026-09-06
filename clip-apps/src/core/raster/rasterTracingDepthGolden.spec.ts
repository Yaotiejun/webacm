import { describe, expect, it } from 'vitest'
import { sampleTracingPolyline } from './tracingSampling'
import {
  countTracingPathPoints,
  sampleTracingPathGripStep,
} from './rasterGripTracingSamplePath'
import {
  RASTER_TRACING_GOLDEN_RECT,
  RASTER_TRACING_GRIP_SAMPLE_COUNTS,
} from './rasterTracingDepthGolden'

describe('rasterTracingDepthGolden', () => {
  it('grip samplePath point counts match pinned golden', () => {
    expect(sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 0.5).length).toBe(
      RASTER_TRACING_GRIP_SAMPLE_COUNTS.step0_5,
    )
    expect(sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 1).length).toBe(
      RASTER_TRACING_GRIP_SAMPLE_COUNTS.step1,
    )
    expect(sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 2).length).toBe(
      RASTER_TRACING_GRIP_SAMPLE_COUNTS.step2,
    )
  })

  it('shape_cam adaptive sample is at least as dense as grip at same tracingStep', () => {
    for (const step of [0.5, 1, 2] as const) {
      const gripN = sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, step).length
      const ours = sampleTracingPolyline([...RASTER_TRACING_GOLDEN_RECT], step).length
      expect(ours).toBeGreaterThanOrEqual(gripN)
    }
  })

  it('coarser tracingStep reduces grip sample count monotonically', () => {
    const a = sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 0.5).length
    const b = sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 1).length
    const c = sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 2).length
    expect(a).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(c)
  })

  it('budget helper counts multi-path totals', () => {
    const paths = [
      sampleTracingPathGripStep(RASTER_TRACING_GOLDEN_RECT, 2),
      sampleTracingPathGripStep(
        [
          [0, 0],
          [10, 0],
        ],
        2,
      ),
    ]
    expect(countTracingPathPoints(paths)).toBe(41 + 6)
  })
})
