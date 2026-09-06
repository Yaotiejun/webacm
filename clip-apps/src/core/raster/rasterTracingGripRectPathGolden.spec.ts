// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  gripRectTracingPathAtStep,
  RASTER_TRACING_GRIP_RECT_PATH_SHA256,
  RASTER_TRACING_GRIP_RECT_PATH_STEP05_SHA256,
  RASTER_TRACING_GRIP_RECT_PATH_STEP2_SHA256,
  sha256GripTracingPathXY,
} from './rasterTracingGripRectPathGolden'
import { RASTER_TRACING_GRIP_SAMPLE_COUNTS } from './rasterTracingDepthGolden'

describe('rasterTracingGripRectPathGolden', () => {
  it('grip rect samplePath step=1 XY path is pinned', () => {
    const path = gripRectTracingPathAtStep(1)
    expect(path.length).toBe(RASTER_TRACING_GRIP_SAMPLE_COUNTS.step1)
    expect(sha256GripTracingPathXY(path)).toBe(RASTER_TRACING_GRIP_RECT_PATH_SHA256)
  })

  it('grip rect samplePath step=2 XY path is pinned', () => {
    const path = gripRectTracingPathAtStep(2)
    expect(path.length).toBe(RASTER_TRACING_GRIP_SAMPLE_COUNTS.step2)
    expect(sha256GripTracingPathXY(path)).toBe(RASTER_TRACING_GRIP_RECT_PATH_STEP2_SHA256)
  })

  it('grip rect samplePath step=0.5 XY path is pinned', () => {
    const path = gripRectTracingPathAtStep(0.5)
    expect(path.length).toBe(RASTER_TRACING_GRIP_SAMPLE_COUNTS.step0_5)
    expect(sha256GripTracingPathXY(path)).toBe(RASTER_TRACING_GRIP_RECT_PATH_STEP05_SHA256)
  })
})
