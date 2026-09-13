import { describe, expect, it } from 'vitest'
import { parseGrblStatusReport } from './grblLineParse'

describe('grblLineParse tool/level', () => {
  it('parses T: tool and O: level from status', () => {
    const s = parseGrblStatusReport(
      '<Idle|MPos:0,0,0|WPos:0,0,0|W:3.300|T:1,-12.345|O:0.120|A:0|H:0|Buf:15>',
    )
    expect(s?.probe?.voltage).toBe(3.3)
    expect(s?.tool).toEqual({ number: 1, offset: -12.345 })
    expect(s?.level?.deviation).toBe(0.12)
  })
})
