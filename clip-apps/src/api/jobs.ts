import type { SliceJobPayload } from '@/types/job'
import type { SliceResultSummary, SliceInputMeta, SliceLegacyDebugSnapshot } from '@/api/slice'
import type { SliceBackendKind } from '@/api/slice-backend'
import type { FdmProcess } from '@/types/process'
import type { SliceTelemetryDigestEntry } from '@/core/slicer/sliceTelemetryDigest'

export interface FdmJobRecord extends SliceJobPayload {
  summary?: SliceResultSummary
  backend?: SliceBackendKind
  processSnapshot?: FdmProcess
  sliceTelemetryDigest?: SliceTelemetryDigestEntry[]
  /** Last slice input geometry stats (migration / diff vs grip). */
  sliceInputMeta?: SliceInputMeta
  /** Last legacy FDM runtime health snapshot captured from worker. */
  sliceLegacyDebug?: SliceLegacyDebugSnapshot
  currentDiagnosticsSnapshot?: string
  jobBounds?: {
    size: { x: number; y: number; z: number }
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

const STORAGE_KEY = 'ws-fdm-jobs'

function safeGetStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export async function listFdmJobs(): Promise<FdmJobRecord[]> {
  const storage = safeGetStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as FdmJobRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function getFdmJob(id: string): Promise<FdmJobRecord | null> {
  const all = await listFdmJobs()
  return all.find((j) => j.id === id) ?? null
}

export async function saveFdmJob(job: FdmJobRecord): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listFdmJobs()
  const now = Date.now()
  const existingIndex = all.findIndex((j) => j.id === job.id)
  const record: FdmJobRecord = {
    ...job,
    updatedAt: now,
    createdAt: job.createdAt || now,
  }
  if (existingIndex >= 0) {
    all[existingIndex] = record
  } else {
    all.push(record)
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteFdmJob(id: string): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listFdmJobs()
  const next = all.filter((j) => j.id !== id)
  storage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export interface CarveraJobRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  size?: number
  content?: string
}

const CARVERA_STORAGE_KEY = 'ws-carvera-jobs'

export async function listCarveraJobs(): Promise<CarveraJobRecord[]> {
  const storage = safeGetStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(CARVERA_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CarveraJobRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function getCarveraJob(id: string): Promise<CarveraJobRecord | null> {
  const all = await listCarveraJobs()
  return all.find((j) => j.id === id) ?? null
}

export async function saveCarveraJob(job: CarveraJobRecord): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listCarveraJobs()
  const now = Date.now()
  const existingIndex = all.findIndex((j) => j.id === job.id)
  const record: CarveraJobRecord = {
    ...job,
    updatedAt: now,
    createdAt: job.createdAt || now,
  }
  if (existingIndex >= 0) {
    all[existingIndex] = record
  } else {
    all.push(record)
  }
  storage.setItem(CARVERA_STORAGE_KEY, JSON.stringify(all))
}

export async function deleteCarveraJob(id: string): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listCarveraJobs()
  const next = all.filter((j) => j.id !== id)
  storage.setItem(CARVERA_STORAGE_KEY, JSON.stringify(next))
}

export interface GridBotJobRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  content?: string
}

const GRIDBOT_STORAGE_KEY = 'ws-gridbot-jobs'

export async function listGridBotJobs(): Promise<GridBotJobRecord[]> {
  const storage = safeGetStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(GRIDBOT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GridBotJobRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function getGridBotJob(id: string): Promise<GridBotJobRecord | null> {
  const all = await listGridBotJobs()
  return all.find((j) => j.id === id) ?? null
}

export async function saveGridBotJob(job: GridBotJobRecord): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listGridBotJobs()
  const now = Date.now()
  const existingIndex = all.findIndex((j) => j.id === job.id)
  const record: GridBotJobRecord = {
    ...job,
    updatedAt: now,
    createdAt: job.createdAt || now,
  }
  if (existingIndex >= 0) {
    all[existingIndex] = record
  } else {
    all.push(record)
  }
  storage.setItem(GRIDBOT_STORAGE_KEY, JSON.stringify(all))
}

export async function deleteGridBotJob(id: string): Promise<void> {
  const storage = safeGetStorage()
  if (!storage) return
  const all = await listGridBotJobs()
  const next = all.filter((j) => j.id !== id)
  storage.setItem(GRIDBOT_STORAGE_KEY, JSON.stringify(next))
}
