import { describe, expect, it } from 'vitest'
import { formatGripTcpTarget, parseGripTcpTarget } from './deviceBridgeTcpTarget'

describe('deviceBridgeTcpTarget', () => {
  it('parseGripTcpTarget accepts host:port', () => {
    expect(parseGripTcpTarget('192.168.1.10:3001')).toEqual({ host: '192.168.1.10', port: 3001 })
    expect(parseGripTcpTarget('bad')).toBeNull()
    expect(formatGripTcpTarget('127.0.0.1', 9999)).toBe('127.0.0.1:9999')
  })
})
