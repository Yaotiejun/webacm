import { describe, expect, it } from 'vitest'
import { formatCamGcodeMotionLine, summarizeCamGcodeMotion } from './camGcodeStats'

describe('camGcodeStats', () => {
  it('counts G0/G1 and skips comments', () => {
    const s = summarizeCamGcodeMotion('; header\nG0 X0 Y0\nG1 X1 F100\nG02 X2 I1\n')
    expect(s.nonCommentLines).toBe(3)
    expect(s.g0).toBe(1)
    expect(s.g1).toBe(1)
    expect(s.g2).toBe(1)
    expect(formatCamGcodeMotionLine(s)).toContain('G0=1')
  })
})
