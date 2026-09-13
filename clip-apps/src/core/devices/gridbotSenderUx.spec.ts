import { describe, expect, it } from 'vitest'
import { GRIDBOT_GCODE_MACROS } from './deviceGcodeMacros'
import {
  filterNonEmptyGcodeLines,
  GRIDBOT_CANCEL_SAFETY_SCRIPT,
  GRIDBOT_ESTOP_SCRIPT,
  GRIDBOT_PAUSE_PARK_SCRIPT,
} from './gridbotSafetyScripts'

describe('gridbot sender macros + safety', () => {
  it('exposes FDM macros without GRBL $X', () => {
    const ids = GRIDBOT_GCODE_MACROS.map((m) => m.id)
    expect(ids).toContain('endstops')
    expect(ids).toContain('feed100')
    expect(GRIDBOT_GCODE_MACROS.every((m) => !m.line.startsWith('$'))).toBe(true)
  })

  it('park / cancel / estop scripts are non-empty G-code', () => {
    expect(filterNonEmptyGcodeLines(GRIDBOT_PAUSE_PARK_SCRIPT).length).toBeGreaterThan(0)
    expect(filterNonEmptyGcodeLines(GRIDBOT_CANCEL_SAFETY_SCRIPT)).toContain('M104 S0')
    expect(filterNonEmptyGcodeLines(GRIDBOT_ESTOP_SCRIPT)[0]).toBe('M112')
  })
})
