import { describe, expect, it } from 'vitest'
import { buildCamPostRunGripFeedback } from './camPostRunGripFeedback'
import gripFixtureGcode from './fixtures/grip-cam-export-sample.gcode.txt?raw'

describe('buildCamPostRunGripFeedback', () => {
  it('returns success for bundled legacy capture gcode', () => {
    const fb = buildCamPostRunGripFeedback(gripFixtureGcode)
    expect(fb?.level).toBe('success')
  })

  it('returns warning for unrelated gcode', () => {
    const fb = buildCamPostRunGripFeedback('G0 X0\n')
    expect(fb?.level).toBe('warning')
  })

  it('returns null when gcode empty', () => {
    expect(buildCamPostRunGripFeedback('')).toBeNull()
  })
})
