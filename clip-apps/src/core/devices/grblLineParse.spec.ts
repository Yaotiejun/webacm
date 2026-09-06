import { describe, expect, it } from 'vitest'
import {
  parseGrblAlarmLine,
  parseGrblAxisLine,
  parseGrblBannerLine,
  parseGrblErrorLine,
  parseGrblSpindleLine,
  parseGrblStatusReport,
} from './grblLineParse'

describe('grblLineParse', () => {
  it('parses axis tokens', () => {
    expect(parseGrblAxisLine('X1.5 Y-2 Z0')).toEqual({ x: 1.5, y: -2, z: 0 })
  })

  it('parses spindle M-codes', () => {
    expect(parseGrblSpindleLine('M3 S12000')).toEqual({ spindleOn: true, spindleRpm: 12000 })
    expect(parseGrblSpindleLine('M5')).toEqual({ spindleOn: false })
  })

  it('parses grbl status reports', () => {
    const s = parseGrblStatusReport('<Idle|MPos:10.000,20.000,2.500|FS:0,0>')
    expect(s?.mpos).toEqual({ x: 10, y: 20, z: 2.5 })
    expect(s?.runState).toBe('IDLE')
  })

  it('parses WPos, FS override, and Buf (carve-control status)', () => {
    const s = parseGrblStatusReport(
      '<Run|MPos:1,2,3,90|WPos:10,20,2.5|FS:1200,3000,100|Buf:12>',
    )
    expect(s?.mpos).toEqual({ x: 1, y: 2, z: 3, a: 90 })
    expect(s?.wpos).toEqual({ x: 10, y: 20, z: 2.5 })
    expect(s?.feed).toEqual({ current: 1200, target: 3000, overridePct: 100 })
    expect(s?.buf).toBe(12)
    expect(s?.runState).toBe('RUN')
  })

  it('parses setup A and halt H (carve-control)', () => {
    const s = parseGrblStatusReport('<Idle|MPos:0,0,0|A:2|H:0|Buf:1>')
    expect(s?.setup).toEqual({ state: 2 })
    expect(s?.halt).toEqual({ code: 0 })
  })

  it('parses spin S and play P (carve-control)', () => {
    const s = parseGrblStatusReport(
      '<Run|MPos:0,0,0|S:8000,10000,100,0|P:120,45.5,90|Buf:3>',
    )
    expect(s?.spin).toEqual({ current: 8000, target: 10000, scale: 100, extra: 0 })
    expect(s?.play).toEqual({ line: 120, percent: 45.5, seconds: 90 })
  })

  it('parses laser L and probe W (carve-control)', () => {
    const s = parseGrblStatusReport(
      '<Idle|MPos:0,0,0|WPos:0,0,0|L:12.5,255,100,0|W:3.3|Buf:8>',
    )
    expect(s?.laser).toEqual({ current: 12.5, target: 255, scale: 100, extra: 0 })
    expect(s?.probe).toEqual({ voltage: 3.3 })
    expect(s?.buf).toBe(8)
  })

  it('does not treat WPos as probe W', () => {
    const s = parseGrblStatusReport('<Idle|WPos:1,2,3>')
    expect(s?.wpos).toEqual({ x: 1, y: 2, z: 3 })
    expect(s?.probe).toBeUndefined()
  })

  it('parses alarm/hold/door run states', () => {
    expect(parseGrblStatusReport('<Alarm|...>')?.runState).toBe('ALARM')
    expect(parseGrblStatusReport('<Hold|...>')?.runState).toBe('HOLD')
    expect(parseGrblStatusReport('<Door|...>')?.runState).toBe('DOOR')
  })

  it('parses error lines', () => {
    expect(parseGrblErrorLine('error: Invalid gcode ID:24')).toBe('Invalid gcode ID:24')
  })

  it('parses ALARM code and Grbl banner', () => {
    expect(parseGrblAlarmLine('ALARM:9')).toBe(9)
    expect(parseGrblAlarmLine('ok')).toBeNull()
    expect(parseGrblBannerLine("Grbl 1.1h ['$' for help]")).toEqual({ version: '1.1h' })
  })
})
