import { describe, expect, it } from 'vitest'
import { GripAppServerRequestTracker } from './gripAppServerRequestTracker'

describe('gripAppServerRequestTracker', () => {
  it('tracks open and completed requests and sockets', () => {
    const t = new GripAppServerRequestTracker()
    const closeReq = t.openRequest()
    const closeSock = t.openSocket()
    expect(t.snapshot().openRequests).toBe(1)
    expect(t.snapshot().openSockets).toBe(1)
    closeReq()
    closeSock()
    const s = t.snapshot()
    expect(s.openRequests).toBe(0)
    expect(s.openSockets).toBe(0)
    expect(s.completedRequests).toBe(1)
    expect(s.completedSockets).toBe(1)
  })
})
