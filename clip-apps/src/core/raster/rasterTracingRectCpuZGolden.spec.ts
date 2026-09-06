// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  RASTER_TRACING_GRIP_RECT_CPU_Z,
  traceGripRectCpuZOnFlatTerrain,
} from './rasterTracingRectCpuZGolden'

describe('rasterTracingRectCpuZGolden', () => {
  it('grip rect samplePath step=1 CPU Z checksum on flat terrain', () => {
    const r = traceGripRectCpuZOnFlatTerrain(1)
    expect(r.pointCount).toBe(RASTER_TRACING_GRIP_RECT_CPU_Z.pointCount)
    expect(r.sha256).toBe(RASTER_TRACING_GRIP_RECT_CPU_Z.sha256)
  })
})
