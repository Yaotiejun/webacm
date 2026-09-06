import { defineStore } from 'pinia'
import type { SliceResult, SliceTelemetryEvent } from '@/api/slice'
import type { SliceBackendKind } from '@/api/slice-backend'
import { pushSliceTelemetryTimelineEntry } from '@/core/slicer/sliceTelemetryTimeline'
import { getSliceTelemetryTimelineMaxEntries } from '@/core/slicer/sliceTelemetryConfig'
import { normalizeSliceTelemetryTimelineEntries } from '@/core/slicer/sliceTelemetryRestore'
import {
  listFdmJobs,
  getFdmJob,
  saveFdmJob,
  deleteFdmJob,
  type FdmJobRecord,
} from '@/api/jobs'
import { clonePlain } from '@/core/clonePlain'

/** Browser `localStorage` key for FDM slice backend (`mock` | `kiri`); see `useFdmStore`. */
export const FDM_SLICE_BACKEND_KIND_STORAGE_KEY = 'ws-fdm-slice-backend-kind'

/** Persisted FDM workspace slice backend (Mock vs Kiri); survives full page reload. */
function readStoredSliceBackendKind(): SliceBackendKind {
  if (typeof localStorage === 'undefined') return 'kiri'
  try {
    const raw = localStorage.getItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY)
    if (raw === 'mock' || raw === 'kiri') return raw
  } catch {
    // private mode / storage denied
  }
  return 'kiri'
}

function persistSliceBackendKind(kind: SliceBackendKind): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FDM_SLICE_BACKEND_KIND_STORAGE_KEY, kind)
  } catch {
    // ignore quota / denied
  }
}

/** When true, FDM export paths append diagnostics / telemetry comments to G-code (workspace default: on). */
export const FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY = 'ws-fdm-export-include-diagnostics'

function readStoredExportGcodeIncludeDiagnostics(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const raw = localStorage.getItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY)
    if (raw === '0' || raw === 'false') return false
    if (raw === '1' || raw === 'true') return true
  } catch {
    // private mode / storage denied
  }
  return true
}

function persistExportGcodeIncludeDiagnostics(flag: boolean): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(FDM_EXPORT_GCODE_INCLUDE_DIAGNOSTICS_STORAGE_KEY, flag ? '1' : '0')
  } catch {
    // ignore
  }
}

export const useFdmStore = defineStore('fdm', {
  state: () => ({
    jobs: [] as FdmJobRecord[],
    selectedJobId: null as string | null,
    sliceResult: null as SliceResult | null,
    sliceTelemetryTimeline: [] as Array<SliceTelemetryEvent & { ts: number }>,
    backendKind: readStoredSliceBackendKind(),
    exportGcodeIncludeDiagnostics: readStoredExportGcodeIncludeDiagnostics(),
    slicing: false,
  }),

  getters: {
    currentJob(state): FdmJobRecord | null {
      return state.selectedJobId
        ? state.jobs.find((j) => j.id === state.selectedJobId) ?? null
        : null
    },
  },

  actions: {
    async loadJobs() {
      this.jobs = clonePlain(await listFdmJobs()) as FdmJobRecord[]
    },

    async refreshJob(id: string) {
      const job = await getFdmJob(id)
      if (!job) return
      const snap = clonePlain(job) as FdmJobRecord
      const idx = this.jobs.findIndex((j) => j.id === id)
      if (idx >= 0) {
        this.jobs.splice(idx, 1, snap)
      } else {
        this.jobs.unshift(snap)
      }
    },

    async saveJob(record: FdmJobRecord) {
      const snap = clonePlain(record) as FdmJobRecord
      await saveFdmJob(snap)
      await this.loadJobs()
      this.selectedJobId = snap.id
    },

    async removeJob(id: string) {
      await deleteFdmJob(id)
      await this.loadJobs()
      if (this.selectedJobId === id) {
        this.selectedJobId = this.jobs[0]?.id ?? null
      }
    },

    selectJob(id: string | null) {
      this.selectedJobId = id
    },

    setSliceResult(result: SliceResult | null) {
      this.sliceResult = result == null ? null : clonePlain(result)
    },

    pushSliceTelemetryEvent(event: SliceTelemetryEvent) {
      this.sliceTelemetryTimeline = pushSliceTelemetryTimelineEntry(this.sliceTelemetryTimeline, event, {
        maxEntries: getSliceTelemetryTimelineMaxEntries(),
      })
    },

    setSliceTelemetryTimeline(entries: Array<SliceTelemetryEvent & { ts: number }>) {
      const max = getSliceTelemetryTimelineMaxEntries()
      this.sliceTelemetryTimeline = normalizeSliceTelemetryTimelineEntries(entries, max)
    },

    clearSliceTelemetryTimeline() {
      this.sliceTelemetryTimeline = []
    },

    setBackendKind(kind: SliceBackendKind) {
      this.backendKind = kind
      persistSliceBackendKind(kind)
    },

    setExportGcodeIncludeDiagnostics(flag: boolean) {
      this.exportGcodeIncludeDiagnostics = flag
      persistExportGcodeIncludeDiagnostics(flag)
    },

    setSlicing(flag: boolean) {
      this.slicing = flag
    },
  },
})
