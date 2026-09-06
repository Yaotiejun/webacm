import { describe, expect, it } from 'vitest'
import { estimateCamPlaceholderSummary } from '@/core/cam/camJobSummaryBridge'
import {
  compareCamPlaceholderDepthTighten,
  GRIP_CAPTURE_PLACEHOLDER_GEOMETRY,
  GRIP_CAPTURE_PLACEHOLDER_PROCESS,
  GRIP_CAPTURE_PLACEHOLDER_ROUGH_PASSES,
} from './camPlaceholderDepthTighten'

describe('camPlaceholderDepthTighten', () => {
  it('capture process placeholder rough passes are pinned', () => {
    const { perOp } = estimateCamPlaceholderSummary(
      GRIP_CAPTURE_PLACEHOLDER_PROCESS,
      GRIP_CAPTURE_PLACEHOLDER_GEOMETRY,
    )
    expect(perOp[0]?.estimatedPasses).toBe(GRIP_CAPTURE_PLACEHOLDER_ROUGH_PASSES)
  })

  it('placeholder passes align with live fixture Z clearance span', () => {
    const r = compareCamPlaceholderDepthTighten()
    expect(r.match).toBe(true)
    expect(r.placeholderPasses).toBe(1)
    expect(r.gcodeZSpan).toBe(8)
  })
})
