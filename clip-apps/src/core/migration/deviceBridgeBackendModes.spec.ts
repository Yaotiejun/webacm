import { describe, expect, it } from 'vitest'
import { parseDeviceBridgeTcpEndpoint, parseDeviceBridgeTcpState } from './deviceBridgeBackendModes'

describe('deviceBridgeBackendModes', () => {
  it('parses bridge tcp hints', () => {
    expect(parseDeviceBridgeTcpState('[bridge] tcp connected')).toBe('connected')
    expect(parseDeviceBridgeTcpState('[bridge] tcp closed')).toBe('closed')
    expect(parseDeviceBridgeTcpState('[bridge] tcp error')).toBe('error')
  })

  it('parses tcp endpoint host:port', () => {
    expect(parseDeviceBridgeTcpEndpoint('[bridge] tcp connected 192.168.1.10:23')).toBe(
      '192.168.1.10:23',
    )
  })
})
