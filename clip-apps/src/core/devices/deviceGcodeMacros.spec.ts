import { describe, expect, it } from 'vitest'
import { DEVICE_GCODE_MACROS } from './deviceGcodeMacros'

describe('deviceGcodeMacros', () => {
  it('includes status and motion presets', () => {
    const ids = DEVICE_GCODE_MACROS.map((m) => m.id)
    expect(ids).toContain('home')
    expect(ids).toContain('pos')
    expect(ids).toContain('estop')
    expect(ids).toContain('unlock')
    expect(DEVICE_GCODE_MACROS.find((m) => m.id === 'home')?.line).toBe('G28')
    expect(DEVICE_GCODE_MACROS.find((m) => m.id === 'unlock')?.line).toBe('$X')
  })
})
