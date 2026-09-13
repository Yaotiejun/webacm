import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const jobsMocks = vi.hoisted(() => ({
  listCarveraJobs: vi.fn(),
  saveCarveraJob: vi.fn(),
  deleteCarveraJob: vi.fn(),
}))

vi.mock('@/api/jobs', () => ({
  listCarveraJobs: (...args: unknown[]) => jobsMocks.listCarveraJobs(...args),
  saveCarveraJob: (...args: unknown[]) => jobsMocks.saveCarveraJob(...args),
  deleteCarveraJob: (...args: unknown[]) => jobsMocks.deleteCarveraJob(...args),
}))

const deviceMocks = vi.hoisted(() => ({
  isConnected: false,
  lineHandler: null as null | ((line: string) => void),
  controlHandler: null as null | ((ev: Record<string, unknown>) => void),
  autoOk: true,
}))

const sendCarveraLineMock = vi.hoisted(() =>
  vi.fn((line: string) => {
    if (deviceMocks.autoOk && line !== '?') {
      queueMicrotask(() => deviceMocks.lineHandler?.('ok'))
    }
  }),
)

const uploadCarveraSdAndMaybePlayMock = vi.hoisted(() =>
  vi.fn(async (opts: { path: string; content: string; play?: boolean }) => {
    queueMicrotask(() => {
      deviceMocks.controlHandler?.({
        type: 'xmodem',
        phase: 'start',
        path: opts.path,
        block: 0,
        total: 1,
      })
      deviceMocks.controlHandler?.({
        type: 'xmodem',
        phase: 'progress',
        path: opts.path,
        block: 1,
        total: 1,
      })
      deviceMocks.controlHandler?.({ type: 'uploaded', path: opts.path, md5: 'abc' })
      if (opts.play) {
        deviceMocks.controlHandler?.({ type: 'played', path: opts.path })
      }
      deviceMocks.controlHandler?.({
        type: 'xmodem',
        phase: 'end',
        path: opts.path,
        block: 1,
        total: 1,
      })
    })
    return { path: opts.path, md5: 'abc' }
  }),
)

vi.mock('@/api/device', () => ({
  connectCarvera: vi.fn(async () => {
    deviceMocks.isConnected = true
  }),
  disconnectCarvera: vi.fn(() => {
    deviceMocks.isConnected = false
    deviceMocks.lineHandler = null
    deviceMocks.controlHandler = null
  }),
  isCarveraConnected: vi.fn(() => deviceMocks.isConnected),
  sendCarveraLine: sendCarveraLineMock,
  subscribeCarveraLines: (handler: (line: string) => void) => {
    deviceMocks.lineHandler = handler
    return () => {
      deviceMocks.lineHandler = null
    }
  },
  subscribeCarveraControl: (handler: (ev: Record<string, unknown>) => void) => {
    deviceMocks.controlHandler = handler
    return () => {
      deviceMocks.controlHandler = null
    }
  },
  uploadCarveraSdAndMaybePlay: (...args: unknown[]) =>
    uploadCarveraSdAndMaybePlayMock(...(args as [any])),
  listCarveraSd: vi.fn(async () => ({
    path: '/sd/gcodes',
    dir: ['sd', 'gcodes'],
    list: [],
  })),
  removeCarveraSd: vi.fn(async (opts: { path: string }) => ({ path: opts.path })),
  playCarveraSd: vi.fn(async (opts: { path: string }) => ({ path: opts.path })),
  sendCarveraBinary: vi.fn(),
  sendCarveraControl: vi.fn(),
}))

import { useCarveraStore } from './useCarveraStore'
import type { CarveraJobRecord } from '@/api/jobs'

describe('stores.useCarveraStore job list clone isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    deviceMocks.isConnected = false
    deviceMocks.lineHandler = null
    deviceMocks.controlHandler = null
    deviceMocks.autoOk = true
    sendCarveraLineMock.mockClear()
    uploadCarveraSdAndMaybePlayMock.mockClear()
  })

  it('loadJobs stores a clone so mutating API-returned array does not change store', async () => {
    const shared: CarveraJobRecord[] = [{ id: 'j1', name: 'A', createdAt: 1, updatedAt: 1 }]
    jobsMocks.listCarveraJobs.mockResolvedValue(shared)
    const store = useCarveraStore()
    await store.loadJobs()
    shared[0].name = 'mutated'
    expect(store.jobs[0]?.name).toBe('A')
  })

  it('setJobs stores a clone so mutating caller list after await does not change store', async () => {
    jobsMocks.saveCarveraJob.mockResolvedValue(undefined)
    const list: CarveraJobRecord[] = [{ id: 'j2', name: 'B', createdAt: 2, updatedAt: 2 }]
    const store = useCarveraStore()
    await store.setJobs(list)
    list[0].name = 'mutated'
    expect(store.jobs[0]?.name).toBe('B')
    expect(jobsMocks.saveCarveraJob).toHaveBeenCalled()
  })

  it('addJob snapshots caller job before save', async () => {
    jobsMocks.saveCarveraJob.mockResolvedValue(undefined)
    jobsMocks.listCarveraJobs.mockResolvedValue([{ id: 'j3', name: 'C', createdAt: 3, updatedAt: 3 }])
    const store = useCarveraStore()
    const job: CarveraJobRecord = { id: 'j3', name: 'C', createdAt: 3, updatedAt: 3 }
    await store.addJob(job)
    job.name = 'mutated'
    const saved = jobsMocks.saveCarveraJob.mock.calls[0]?.[0] as CarveraJobRecord
    expect(saved.name).toBe('C')
  })

  it('sendJobLines ack-gates lines when socket open', async () => {
    const store = useCarveraStore()
    await store.connect()
    expect(store.connected).toBe(true)
    await store.sendJobLines('G28\nG1 X1\n', 0)
    expect(sendCarveraLineMock).toHaveBeenCalledTimes(2)
    expect(sendCarveraLineMock).toHaveBeenNthCalledWith(1, 'G28')
    expect(sendCarveraLineMock).toHaveBeenNthCalledWith(2, 'G1 X1')
    expect(store.sendSentLines).toBe(2)
    expect(store.sending).toBe(false)
  })

  it('jogRelative supports A axis', async () => {
    const store = useCarveraStore()
    await store.connect()
    store.jogRelative('A', 90)
    expect(sendCarveraLineMock).toHaveBeenCalledWith('G91')
    expect(sendCarveraLineMock).toHaveBeenCalledWith('G0 A90')
    expect(sendCarveraLineMock).toHaveBeenCalledWith('G90')
  })

  it('setWcsZero sends carve-control zero macros', async () => {
    const store = useCarveraStore()
    await store.connect()
    store.setWcsZero('X')
    expect(sendCarveraLineMock).toHaveBeenCalledWith('G10L20P0X0')
    store.setWcsZero('A')
    expect(sendCarveraLineMock).toHaveBeenCalledWith('G92.4A0')
  })

  it('uploadAndPlayJob calls bridge SD upload+play', async () => {
    const store = useCarveraStore()
    await store.connect()
    await store.uploadAndPlayJob('G0 X0\nG1 X1\n', 'demo.nc', true)
    expect(uploadCarveraSdAndMaybePlayMock).toHaveBeenCalled()
    const arg = uploadCarveraSdAndMaybePlayMock.mock.calls[0]?.[0] as {
      path: string
      content: string
      play: boolean
    }
    expect(arg.path).toMatch(/^\/sd\/gcodes\//)
    expect(arg.content).toContain('G1 X1')
    expect(arg.play).toBe(true)
    expect(store.sdLastMd5).toBe('abc')
    expect(store.sdUploading).toBe(false)
  })

  it('pauseSend holds sendPaused while sending', async () => {
    const store = useCarveraStore()
    await store.connect()
    void store.sendJobLines('G28\nG1 X1\nG1 X2\n', 40)
    await vi.waitFor(() => expect(store.sending).toBe(true))
    store.pauseSend()
    expect(store.sendPaused).toBe(true)
    store.resumeSend()
    expect(store.sendPaused).toBe(false)
    await vi.waitFor(() => expect(store.sending).toBe(false), { timeout: 5000 })
  })
})
