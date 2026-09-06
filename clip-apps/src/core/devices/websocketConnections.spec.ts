import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CarveraConnection } from './carvera'
import { GridBotConnection } from './gridbot'

/** Minimal fake so `CarveraConnection` / `GridBotConnection` can be exercised without a real server. */
class FakeWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3

  static last: FakeWebSocket | null = null

  url: string
  readyState = FakeWebSocket.CONNECTING
  sent: string[] = []
  private readonly listeners = new Map<string, Set<(ev: unknown) => void>>()

  constructor(url: string | URL) {
    FakeWebSocket.last = this
    this.url = typeof url === 'string' ? url : url.toString()
  }

  addEventListener(type: string, fn: (ev: unknown) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(fn)
  }

  removeEventListener() {}

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED
    this.emit('close', {})
  }

  simulateOpen() {
    this.readyState = FakeWebSocket.OPEN
    this.emit('open', {})
  }

  simulateMessage(data: string) {
    this.emit('message', { data })
  }

  simulateError() {
    this.emit('error', {})
  }

  private emit(type: string, ev: unknown) {
    for (const fn of this.listeners.get(type) ?? []) fn(ev)
  }
}

beforeEach(() => {
  FakeWebSocket.last = null
  vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('core.devices.CarveraConnection', () => {
  it('connect resolves after open and sendLine appends newline', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://carvera' })
    const p = c.connect()
    const ws = FakeWebSocket.last!
    expect(ws.url).toBe('ws://carvera')
    ws.simulateOpen()
    await p
    expect(c.isOpen()).toBe(true)
    c.sendLine('G0 X1')
    expect(ws.sent).toEqual(['G0 X1\n'])
  })

  it('sendLine throws when socket is not open', () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    void c.connect()
    expect(() => c.sendLine('M114')).toThrow('Carvera socket not open')
  })

  it('splits CRLF messages and notifies line handlers', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    const lines: string[] = []
    c.onLine((l) => lines.push(l))
    const p = c.connect()
    FakeWebSocket.last!.simulateOpen()
    await p
    FakeWebSocket.last!.simulateMessage('ok\r\nwarn')
    expect(lines).toEqual(['ok', 'warn'])
  })

  it('ignores empty and non-string message payloads', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    let n = 0
    c.onLine(() => {
      n += 1
    })
    const p = c.connect()
    FakeWebSocket.last!.simulateOpen()
    await p
    FakeWebSocket.last!.simulateMessage('')
    FakeWebSocket.last!.simulateMessage('   \n  \t  ')
    FakeWebSocket.last!.simulateMessage('real')
    expect(n).toBe(1)
  })

  it('rejects connect when socket emits error', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    const p = c.connect()
    FakeWebSocket.last!.simulateError()
    await expect(p).rejects.toThrow('Carvera WebSocket error')
  })

  it('disconnect clears socket and close handler nulls internal ref', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    const p = c.connect()
    const ws = FakeWebSocket.last!
    ws.simulateOpen()
    await p
    expect(c.isOpen()).toBe(true)
    ws.close()
    expect(c.isOpen()).toBe(false)
    c.disconnect()
  })

  it('resolves immediately when connect called while already open', async () => {
    const c = new CarveraConnection({ endpoint: 'ws://x' })
    const p1 = c.connect()
    FakeWebSocket.last!.simulateOpen()
    await p1
    await c.connect()
    expect(FakeWebSocket.last?.url).toBe('ws://x')
  })
})

describe('core.devices.GridBotConnection', () => {
  it('connect resolves after open', async () => {
    const c = new GridBotConnection({ endpoint: 'ws://bot' })
    const p = c.connect()
    FakeWebSocket.last!.simulateOpen()
    await p
    expect(c.isOpen()).toBe(true)
  })

  it('sendLine throws when socket is not open', () => {
    const c = new GridBotConnection({ endpoint: 'ws://x' })
    void c.connect()
    expect(() => c.sendLine('M114')).toThrow('GridBot socket not open')
  })

  it('rejects connect on socket error with GridBot message', async () => {
    const c = new GridBotConnection({ endpoint: 'ws://x' })
    const p = c.connect()
    FakeWebSocket.last!.simulateError()
    await expect(p).rejects.toThrow('GridBot WebSocket error')
  })
})
