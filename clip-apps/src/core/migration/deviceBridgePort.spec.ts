import { describe, expect, it } from 'vitest'
import { resolveDeviceBridgePort } from './deviceBridgePort'

describe('resolveDeviceBridgePort', () => {
  it('defaults to 9999', () => {
    expect(resolveDeviceBridgePort(undefined)).toBe(9999)
  })

  it('parses env override', () => {
    expect(resolveDeviceBridgePort('10001')).toBe(10001)
  })
})
