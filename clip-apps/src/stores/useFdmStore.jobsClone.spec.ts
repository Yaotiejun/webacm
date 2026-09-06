import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const m = vi.hoisted(() => ({
  listFdmJobs: vi.fn(() => Promise.resolve([])),
  getFdmJob: vi.fn(() => Promise.resolve(null)),
  saveFdmJob: vi.fn(() => Promise.resolve(undefined)),
  deleteFdmJob: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock('@/api/jobs', () => ({
  listFdmJobs: (...args: unknown[]) => m.listFdmJobs(...args),
  getFdmJob: (...args: unknown[]) => m.getFdmJob(...args),
  saveFdmJob: (...args: unknown[]) => m.saveFdmJob(...args),
  deleteFdmJob: (...args: unknown[]) => m.deleteFdmJob(...args),
}))

import {
  useFdmStore,
  FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY,
  FDM_SLICE_BACKEND_KIND_STORAGE_KEY,
} from './useFdmStore'
import type { FdmJobRecord } from '@/api/jobs'

function minimalJob(overrides: Partial<FdmJobRecord> = {}): FdmJobRecord {
  return {
    id: 'j1',
    name: 'Job',
    createdAt: 1,
    updatedAt: 1,
    mode: 'FDM',
    device: 'd',
    process: 'p',
    material: 'm',
    models: [],
    ...overrides,
  }
}

describe('stores.useFdmStore jobs clone isolation', () => {
  beforeEach(() => {
    localStorage.removeItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY)
    localStorage.removeItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)
    setActivePinia(createPinia())
    vi.clearAllMocks()
    m.listFdmJobs.mockResolvedValue([])
    m.getFdmJob.mockResolvedValue(null)
    m.saveFdmJob.mockResolvedValue(undefined)
    m.deleteFdmJob.mockResolvedValue(undefined)
  })

  it('loadJobs stores clone of API list', async () => {
    const shared: FdmJobRecord[] = [minimalJob({ id: 'a', name: 'A' })]
    m.listFdmJobs.mockResolvedValue(shared)
    const store = useFdmStore()
    await store.loadJobs()
    shared[0].name = 'mutated'
    expect(store.jobs[0]?.name).toBe('A')
  })

  it('saveJob passes clone to persistence', async () => {
    m.listFdmJobs.mockResolvedValue([])
    const store = useFdmStore()
    const rec = minimalJob({ id: 'b', name: 'B' })
    await store.saveJob(rec)
    rec.name = 'mutated'
    const saved = m.saveFdmJob.mock.calls[0]?.[0] as FdmJobRecord
    expect(saved.name).toBe('B')
  })

  it('refreshJob inserts clone so API object mutations do not affect store', async () => {
    const apiJob = minimalJob({ id: 'c', name: 'C' })
    m.getFdmJob.mockResolvedValue(apiJob)
    const store = useFdmStore()
    await store.refreshJob('c')
    apiJob.name = 'mutated'
    expect(store.jobs.find((j) => j.id === 'c')?.name).toBe('C')
  })
})
