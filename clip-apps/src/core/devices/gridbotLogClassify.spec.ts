import { describe, expect, it } from 'vitest'
import { classifyGridbotIncomingLogLine } from './gridbotLogClassify'

describe('gridbotLogClassify', () => {
  it('classifies grip-style responses', () => {
    expect(classifyGridbotIncomingLogLine('ok', 'in')).toBe('ok')
    expect(classifyGridbotIncomingLogLine('Error: line 1', 'in')).toBe('error')
    expect(classifyGridbotIncomingLogLine('ok T:200 /210 B:60 /60', 'in')).toBe('temp')
    expect(classifyGridbotIncomingLogLine('X:0 Y:0 Z:0 E:0', 'in')).toBe('position')
    expect(classifyGridbotIncomingLogLine('G28', 'out')).toBe('ok')
  })
})
