import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const jobsMocks = vi.hoisted(() => ({
  listGridBotJobs: vi.fn(),
  saveGridBotJob: vi.fn(),
  deleteGridBotJob: vi.fn(),
}))

vi.mock('@/api/jobs', () => ({
  listGridBotJobs: (...args: unknown[]) => jobsMocks.listGridBotJobs(...args),
  saveGridBotJob: (...args: unknown[]) => jobsMocks.saveGridBotJob(...args),
  deleteGridBotJob: (...args: unknown[]) => jobsMocks.deleteGridBotJob(...args),
}))

const deviceMocks = vi.hoisted(() => ({
  isConnected: false,
  lineHandler: null as null | ((line: string) => void),
  autoOk: true,
}))

const sendGridBotLineMock = vi.hoisted(() =>
  vi.fn((line: string) => {
    if (deviceMocks.autoOk) {
      queueMicrotask(() => deviceMocks.lineHandler?.('ok'))
    }
  }),
)

vi.mock('@/api/device', () => ({
  connectGridBot: vi.fn(async () => {
    deviceMocks.isConnected = true
  }),
  disconnectGridBot: vi.fn(() => {
    deviceMocks.isConnected = false
    deviceMocks.lineHandler = null
  }),
  isGridBotConnected: vi.fn(() => deviceMocks.isConnected),
  sendGridBotLine: sendGridBotLineMock,
  subscribeGridBotLines: (handler: (line: string) => void) => {
    deviceMocks.lineHandler = handler
  },
}))

import { useGridBotStore } from './useGridBotStore'
import type { GridBotJobRecord } from '@/api/jobs'

describe('stores.useGridBotStore job list clone isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    deviceMocks.isConnected = false
    deviceMocks.lineHandler = null
    deviceMocks.autoOk = true
    sendGridBotLineMock.mockClear()
  })

  it('loadJobs stores a clone so mutating API-returned array does not change store', async () => {
    const shared: GridBotJobRecord[] = [{ id: 'g1', name: 'A', createdAt: 1, updatedAt: 1 }]
    jobsMocks.listGridBotJobs.mockResolvedValue(shared)
    const store = useGridBotStore()
    await store.loadJobs()
    shared[0].name = 'mutated'
    expect(store.jobs[0]?.name).toBe('A')
  })

  it('saveJob passes a clone to persistence', async () => {
    jobsMocks.saveGridBotJob.mockResolvedValue(undefined)
    jobsMocks.listGridBotJobs.mockResolvedValue([])
    const store = useGridBotStore()
    const job: GridBotJobRecord = { id: 'g2', name: 'B', createdAt: 2, updatedAt: 2 }
    await store.saveJob(job)
    job.name = 'mutated'
    const saved = jobsMocks.saveGridBotJob.mock.calls[0]?.[0] as GridBotJobRecord
    expect(saved.name).toBe('B')
  })

  it('printRun mirrors grip status.print.run during send', async () => {
    const store = useGridBotStore()
    expect(store.printRun).toBe(false)
    await store.connect()
    const sendPromise = store.sendJobLines('G28\n', 0)
    expect(store.printRun).toBe(true)
    await sendPromise
    expect(store.printRun).toBe(false)
  })

  it('sendJobLines sets printBodyStartedAt after M117 Start ok', async () => {
    const store = useGridBotStore()
    await store.connect()
    await store.sendJobLines('G28\nM117 Start\nG1 X1\n', 0)
    expect(store.printPrepAt).not.toBeNull()
    expect(store.printBodyStartedAt).not.toBeNull()
    expect(store.printBodyStartedAt!).toBeGreaterThanOrEqual(store.printPrepAt!)
    expect(store.printEndedAt).not.toBeNull()
    expect(store.printElapsedPhase).toBe('done')
    expect(store.printElapsedLabel).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('sendJobLines ack-window sends lines after ok', async () => {
    const store = useGridBotStore()
    await store.connect()
    expect(store.connected).toBe(true)
    await store.sendJobLines('G28\n\nG1 X1\n', 0)
    expect(store.sendSentLines).toBe(2)
    expect(sendGridBotLineMock).toHaveBeenCalledTimes(2)
    expect(sendGridBotLineMock).toHaveBeenNthCalledWith(1, 'G28')
    expect(sendGridBotLineMock).toHaveBeenNthCalledWith(2, 'G1 X1')
    expect(store.sendSentLines).toBe(2)
    expect(store.sending).toBe(false)
  })

  it('processIncomingLine parses grip M105/error/resend', () => {
    const store = useGridBotStore()
    store.processIncomingLine('ok T:210.0 /215.0 B:60.0 /65.0')
    expect(store.machine.temp?.nozzle).toBe(210)
    expect(store.machine.temp?.nozzleTarget).toBe(215)
    store.processIncomingLine('Error: checksum mismatch')
    expect(store.lastError).toBe('checksum mismatch')
    store.processIncomingLine('Resend: 12')
    expect(store.lastResendFrom).toBe(12)
  })

  it('handleBridgeLine updates tcp state and endpoint hint', () => {
    const store = useGridBotStore()
    expect(store.handleBridgeLine('[bridge] tcp connected to 192.168.1.10:23')).toBe(true)
    expect(store.bridge.tcpState).toBe('connected')
    expect(store.bridge.lastMessage).toContain('192.168.1.10:23')
    expect(store.handleBridgeLine('[bridge] tcp closed')).toBe(true)
    expect(store.bridge.tcpState).toBe('closed')
    expect(store.handleBridgeLine('ok T:200 B:60')).toBe(false)
  })

  it('pauseSend toggles sendPaused while sending', async () => {
    const store = useGridBotStore()
    await store.connect()
    void store.sendJobLines('G28\nG1 X1\nG1 X2\n', 50)
    await vi.waitFor(() => expect(store.sending).toBe(true))
    store.pauseSend()
    expect(store.sendPaused).toBe(true)
    store.resumeSend()
    expect(store.sendPaused).toBe(false)
    await vi.waitFor(() => expect(store.sending).toBe(false), { timeout: 5000 })
  })
})
