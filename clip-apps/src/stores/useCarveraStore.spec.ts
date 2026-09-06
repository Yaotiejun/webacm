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
  sendCarveraLine: vi.fn(),
}))

vi.mock('@/api/device', () => ({
  connectCarvera: vi.fn(),
  disconnectCarvera: vi.fn(),
  isCarveraConnected: vi.fn(() => deviceMocks.isConnected),
  sendCarveraLine: (...args: unknown[]) => deviceMocks.sendCarveraLine(...args),
  subscribeCarveraLines: vi.fn(),
}))

import { useCarveraStore } from './useCarveraStore'
import type { CarveraJobRecord } from '@/api/jobs'

describe('stores.useCarveraStore job list clone isolation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    deviceMocks.isConnected = false
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

  it('sendJobLines posts lines when socket open', async () => {
    deviceMocks.isConnected = true
    const store = useCarveraStore()
    await store.sendJobLines('G28\nG1 X1\n', 0)
    expect(deviceMocks.sendCarveraLine).toHaveBeenCalledTimes(2)
    expect(store.sendSentLines).toBe(2)
  })

  it('pauseSend holds sendPaused while sending', async () => {
    deviceMocks.isConnected = true
    const store = useCarveraStore()
    void store.sendJobLines('G28\nG1 X1\nG1 X2\n', 40)
    await vi.waitFor(() => expect(store.sending).toBe(true))
    store.pauseSend()
    expect(store.sendPaused).toBe(true)
    store.resumeSend()
    expect(store.sendPaused).toBe(false)
    await vi.waitFor(() => expect(store.sending).toBe(false), { timeout: 5000 })
  })
})
