import { describe, expect, it } from 'vitest'
import { classifyGrblIncomingLogLine } from './grblLogClassify'

describe('grblLogClassify', () => {
  it('classifies grbl lines for log UI', () => {
    expect(classifyGrblIncomingLogLine('ALARM:9', 'in')).toBe('alarm')
    expect(classifyGrblIncomingLogLine('ok', 'in')).toBe('status')
    expect(classifyGrblIncomingLogLine('G0 X1', 'out')).toBe('status')
  })
})
