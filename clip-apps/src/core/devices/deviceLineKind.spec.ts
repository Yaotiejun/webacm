import { describe, expect, it } from 'vitest'
import { classifyDeviceIncomingLine } from './deviceLineKind'

describe('deviceLineKind', () => {
  it('classifies grbl and bridge lines', () => {
    expect(classifyDeviceIncomingLine('[bridge] tcp connected')).toBe('bridge')
    expect(classifyDeviceIncomingLine('ALARM:9')).toBe('alarm')
    expect(classifyDeviceIncomingLine('ok')).toBe('ok')
    expect(classifyDeviceIncomingLine('<Idle|MPos:0,0,0|FS:0,0>')).toBe('status')
    expect(classifyDeviceIncomingLine('X:0.00 Y:0.00 Z:0.00 E:0.00')).toBe('position')
  })
})
