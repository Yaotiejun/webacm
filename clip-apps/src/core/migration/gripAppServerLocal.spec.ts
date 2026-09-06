import { describe, expect, it } from 'vitest'
import {
  gripAppServerNoCacheHeaders,
  isGripAppServerLocalIp,
} from './gripAppServerLocal'

describe('gripAppServerLocal', () => {
  it('matches grip app-server local IPs', () => {
    expect(isGripAppServerLocalIp('127.0.0.1')).toBe(true)
    expect(isGripAppServerLocalIp('::1')).toBe(true)
    expect(isGripAppServerLocalIp('192.168.1.1')).toBe(false)
  })

  it('exports no-cache headers', () => {
    expect(gripAppServerNoCacheHeaders()['Cache-Control']).toContain('no-store')
  })
})
