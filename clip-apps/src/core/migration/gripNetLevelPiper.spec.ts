import { describe, expect, it } from 'vitest'
import { gripNetLevelClone } from './gripNetLevelClone'
import { GripNetLevelLineBuffer } from './gripNetLevelLineBuffer'
import { netLevelDecodeLine, netLevelEncodeLine } from './netLevelLineCodec'
import { GripNetLevelPiper } from './gripNetLevelPiper'

describe('gripNetLevelPiper', () => {
  it('pipes strings between two Piper instances', () => {
    const a = new GripNetLevelPiper('a')
    const b = new GripNetLevelPiper('b')
    a.pipe(b)
    const seen: string[] = []
    b.on('readable', () => {
      let chunk: string | undefined
      while ((chunk = b.read()) !== undefined) seen.push(chunk)
    })
    a.write('hello')
    expect(seen).toEqual(['hello'])
  })

  it('LineBuffer splits CRLF chunks into lines', () => {
    const lines: string[] = []
    const buf = new GripNetLevelLineBuffer((line) => lines.push(line))
    buf.onData('{"op":1}\r\n{"op":2}\n')
    expect(lines).toEqual(['{"op":1}', '{"op":2}'])
    expect(netLevelDecodeLine(lines[0]!)).toEqual({ op: 1 })
  })

  it('clone round-trips objects like net-level util.clone', () => {
    const src = { a: [1, { b: true }], c: 'x' }
    const copy = gripNetLevelClone(src)
    expect(copy).toEqual(src)
    expect(copy).not.toBe(src)
    expect(netLevelDecodeLine(netLevelEncodeLine(src))).toEqual(src)
  })
})
