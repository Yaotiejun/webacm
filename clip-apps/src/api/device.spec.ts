import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const carveraInstances: {
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  isOpen: ReturnType<typeof vi.fn>
  sendLine: ReturnType<typeof vi.fn>
  onLine: ReturnType<typeof vi.fn>
}[] = []

vi.mock('@/core/devices/carvera', () => ({
  CarveraConnection: vi.fn(function CarveraConnection(this: unknown) {
    const self = {
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(() => {}),
      isOpen: vi.fn(() => false),
      sendLine: vi.fn(),
      onLine: vi.fn(),
    }
    carveraInstances.push(self)
    return self
  }),
}))

const gridbotInstances: {
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  isOpen: ReturnType<typeof vi.fn>
  sendLine: ReturnType<typeof vi.fn>
  onLine: ReturnType<typeof vi.fn>
}[] = []

vi.mock('@/core/devices/gridbot', () => ({
  GridBotConnection: vi.fn(function GridBotConnection(this: unknown) {
    const self = {
      connect: vi.fn(async () => {}),
      disconnect: vi.fn(() => {}),
      isOpen: vi.fn(() => false),
      sendLine: vi.fn(),
      onLine: vi.fn(),
    }
    gridbotInstances.push(self)
    return self
  }),
}))

import { CarveraConnection } from '@/core/devices/carvera'
import { GridBotConnection } from '@/core/devices/gridbot'
import {
  connectCarvera,
  connectGridBot,
  disconnectCarvera,
  disconnectGridBot,
  isCarveraConnected,
  isGridBotConnected,
  sendCarveraLine,
  sendGridBotLine,
  subscribeCarveraLines,
  subscribeGridBotLines,
} from './device'

beforeEach(() => {
  carveraInstances.length = 0
  gridbotInstances.length = 0
  disconnectCarvera()
  disconnectGridBot()
  vi.mocked(CarveraConnection).mockClear()
  vi.mocked(GridBotConnection).mockClear()
})

afterEach(() => {
  disconnectCarvera()
  disconnectGridBot()
})

describe('api.device carvera', () => {
  it('connectCarvera creates connection and calls connect', async () => {
    await connectCarvera('ws://localhost:1')
    expect(CarveraConnection).toHaveBeenCalled()
    expect(carveraInstances[0]?.connect).toHaveBeenCalled()
  })

  it('sendCarveraLine throws when not connected', () => {
    expect(() => sendCarveraLine('G0')).toThrow('carvera not connected')
  })

  it('reuses singleton until disconnect', async () => {
    await connectCarvera('ws://a')
    await connectCarvera('ws://b')
    expect(CarveraConnection).toHaveBeenCalledTimes(1)
    disconnectCarvera()
    await connectCarvera('ws://c')
    expect(CarveraConnection).toHaveBeenCalledTimes(2)
  })

  it('isCarveraConnected reflects underlying socket open state', async () => {
    expect(isCarveraConnected()).toBe(false)
    await connectCarvera('ws://x')
    expect(isCarveraConnected()).toBe(false)
    vi.mocked(carveraInstances[0]!.isOpen).mockReturnValue(true)
    expect(isCarveraConnected()).toBe(true)
  })

  it('subscribeCarveraLines registers handler on active connection', async () => {
    expect(() => subscribeCarveraLines(() => {})).toThrow('carvera not connected')
    await connectCarvera('ws://x')
    const h = () => {}
    subscribeCarveraLines(h)
    expect(carveraInstances[0]!.onLine).toHaveBeenCalledWith(h)
  })
})

describe('api.device gridbot', () => {
  it('connectGridBot creates connection and calls connect', async () => {
    await connectGridBot('ws://localhost:2')
    expect(GridBotConnection).toHaveBeenCalled()
    expect(gridbotInstances[0]?.connect).toHaveBeenCalled()
  })

  it('sendGridBotLine throws when not connected', () => {
    expect(() => sendGridBotLine('M114')).toThrow('gridbot not connected')
  })

  it('isGridBotConnected reflects underlying socket open state', async () => {
    expect(isGridBotConnected()).toBe(false)
    await connectGridBot('ws://y')
    expect(isGridBotConnected()).toBe(false)
    vi.mocked(gridbotInstances[0]!.isOpen).mockReturnValue(true)
    expect(isGridBotConnected()).toBe(true)
  })

  it('subscribeGridBotLines registers handler on active connection', async () => {
    expect(() => subscribeGridBotLines(() => {})).toThrow('gridbot not connected')
    await connectGridBot('ws://y')
    const h = () => {}
    subscribeGridBotLines(h)
    expect(gridbotInstances[0]!.onLine).toHaveBeenCalledWith(h)
  })
})
