import { describe, expect, it } from 'vitest'
import {
  normalizeGridbotSensorLine,
  parseGridbotErrorLine,
  parseGridbotM105Line,
  parseGridbotM114Line,
  parseGridbotResendLine,
} from './gridbotLineParse'

describe('gridbotLineParse', () => {
  it('normalizes grip TT/BB sensor quirks', () => {
    expect(normalizeGridbotSensorLine('ok TT:210 /215 BB:60 /65')).toBe('ok T:210/215 B:60/65')
  })

  it('parses M105 with targets', () => {
    expect(parseGridbotM105Line('ok T:210.0 /215.0 B:60.0 /65.0')).toEqual({
      nozzle: 210,
      nozzleTarget: 215,
      bed: 60,
      bedTarget: 65,
    })
  })

  it('parses T0: variant', () => {
    expect(parseGridbotM105Line('T0:200 /205 B:55 /60')).toEqual({
      nozzle: 200,
      nozzleTarget: 205,
      bed: 55,
      bedTarget: 60,
    })
  })

  it('parses M114 position line', () => {
    expect(parseGridbotM114Line('X:1.00 Y:2.00 Z:3.00 E:0.00')).toEqual({
      x: 1,
      y: 2,
      z: 3,
      e: 0,
    })
  })

  it('parses error and resend lines', () => {
    expect(parseGridbotErrorLine('Error: checksum mismatch')).toBe('checksum mismatch')
    expect(parseGridbotResendLine('Resend: 42')).toBe(42)
  })
})
