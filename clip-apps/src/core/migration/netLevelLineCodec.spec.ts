import { describe, expect, it } from 'vitest'
import { netLevelDecodeLine, netLevelEncodeLine } from './netLevelLineCodec'

describe('netLevelLineCodec', () => {
  it('round-trips JSON objects on newline-framed lines', () => {
    const payload = { op: 'ping', n: 42, nested: { ok: true } }
    const line = netLevelEncodeLine(payload)
    expect(line.endsWith('\n')).toBe(true)
    expect(netLevelDecodeLine(line)).toEqual(payload)
  })
})
