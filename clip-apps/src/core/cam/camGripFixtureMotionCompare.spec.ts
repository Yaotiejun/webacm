import { describe, expect, it } from 'vitest'
import gripFixtureGcode from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import { compareCamMotionToGripFixture } from './camGripFixtureMotionCompare'

describe('compareCamMotionToGripFixture', () => {
  it('bundled legacy capture matches grip preview motion stats', () => {
    const r = compareCamMotionToGripFixture(gripFixtureGcode)
    expect(r.match).toBe(true)
  })

  it('reports mismatch for unrelated gcode', () => {
    const r = compareCamMotionToGripFixture('G0 X0\nG1 X1\n')
    expect(r.match).toBe(false)
    expect(r.detail).toContain('不一致')
  })
})
