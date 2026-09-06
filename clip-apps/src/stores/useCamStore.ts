import { defineStore } from 'pinia'
import type { CamDeviceConfig, CamTool, CamProcessConfig } from '@/types/cam'
import type { CamJobInputGeometry, CamJobResult } from '@/types/camJob'
import defaultDeviceJson from '@/core/cam/defaults/kiri-cam-device.json'
import defaultToolsJson from '@/core/cam/defaults/kiri-cam-tools.json'
import defaultProcessJson from '@/core/cam/defaults/kiri-cam-process.json'
import { canonicalizeCamProcessConfig } from '@/core/cam/camJobSummaryBridge'
import { hydrateCamJobGeometry, serializeCamJobGeometry } from '@/core/cam/camGeometryPersist'
import { clonePlain } from '@/core/clonePlain'

export interface CamProfile {
  name: string
  device: CamDeviceConfig
  tools: CamTool[]
  process: CamProcessConfig
}

export interface CamState {
  profiles: CamProfile[]
  selectedProfileName: string | null
  device: CamDeviceConfig | null
  tools: CamTool[]
  process: CamProcessConfig | null
  recentRuns: CamRunSnapshot[]
}

export interface CamRunSnapshot {
  id: string
  createdAt: number
  name: string
  profile: {
    device: CamDeviceConfig
    tools: CamTool[]
    process: CamProcessConfig
  }
  geometry: CamJobInputGeometry
  result: CamJobResult
}

const sampleDevice: CamDeviceConfig = clonePlain(defaultDeviceJson as CamDeviceConfig)
const sampleTools: CamTool[] = clonePlain(defaultToolsJson as CamTool[])
const sampleProcess: CamProcessConfig = canonicalizeCamProcessConfig(clonePlain(defaultProcessJson as CamProcessConfig))

export const useCamStore = defineStore('cam', {
  state: (): CamState => ({
    profiles: [],
    selectedProfileName: null,
    device: null,
    tools: [],
    process: null,
    recentRuns: [],
  }),
  actions: {
    reset() {
      this.profiles = []
      this.selectedProfileName = null
      this.device = null
      this.tools = []
      this.process = null
      this.recentRuns = []
    },
    loadRecentRuns() {
      try {
        const raw = localStorage.getItem('ws-cam-recent-runs')
        if (!raw) {
          this.recentRuns = []
          return
        }
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) {
          this.recentRuns = []
          return
        }
        const list = clonePlain(parsed) as CamRunSnapshot[]
        this.recentRuns = list.map((r) => ({
          ...r,
          geometry: hydrateCamJobGeometry(r.geometry),
          profile: { ...r.profile, process: canonicalizeCamProcessConfig(r.profile.process) },
        }))
        if (this.recentRuns.length) this.saveRecentRuns()
      } catch {
        this.recentRuns = []
      }
    },
    saveRecentRuns() {
      const payload = this.recentRuns.slice(0, 20).map((r) => ({
        ...r,
        geometry: serializeCamJobGeometry(r.geometry),
      }))
      localStorage.setItem('ws-cam-recent-runs', JSON.stringify(payload))
    },
    addRecentRun(run: CamRunSnapshot) {
      const snap = clonePlain({
        ...run,
        geometry: serializeCamJobGeometry(run.geometry),
      }) as CamRunSnapshot
      snap.geometry = hydrateCamJobGeometry(snap.geometry)
      snap.profile = { ...snap.profile, process: canonicalizeCamProcessConfig(snap.profile.process) }
      this.recentRuns = [snap, ...this.recentRuns.filter((r) => r.id !== snap.id)].slice(0, 20)
      this.saveRecentRuns()
    },
    clearRecentRuns() {
      this.recentRuns = []
      this.saveRecentRuns()
    },
    loadRunSnapshot(run: CamRunSnapshot) {
      this.importProfile(
        {
          device: clonePlain(run.profile.device),
          tools: clonePlain(run.profile.tools),
          process: clonePlain(run.profile.process) as CamProcessConfig,
        },
        `${run.profile.process.processName || 'run'}-snapshot`,
      )
    },
    loadSample() {
      const profile: CamProfile = {
        name: 'sample',
        device: clonePlain(sampleDevice),
        tools: clonePlain(sampleTools),
        process: clonePlain(sampleProcess),
      }
      this.profiles = [profile]
      this.selectedProfileName = profile.name
      this.applyProfile(profile)
    },
    applyProfile(profile: CamProfile) {
      this.device = clonePlain(profile.device) as CamDeviceConfig
      this.tools = clonePlain(profile.tools) as CamTool[]
      this.process = canonicalizeCamProcessConfig(profile.process as CamProcessConfig)
    },
    selectProfile(name: string) {
      const profile = this.profiles.find((p) => p.name === name)
      if (!profile) return
      this.selectedProfileName = name
      this.applyProfile(profile)
    },
    upsertProfile(profile: CamProfile) {
      const snap: CamProfile = {
        name: profile.name,
        device: clonePlain(profile.device) as CamDeviceConfig,
        tools: clonePlain(profile.tools) as CamTool[],
        process: canonicalizeCamProcessConfig(profile.process as CamProcessConfig),
      }
      const idx = this.profiles.findIndex((p) => p.name === snap.name)
      if (idx >= 0) {
        this.profiles.splice(idx, 1, snap)
      } else {
        this.profiles.push(snap)
      }
      this.selectedProfileName = snap.name
    },
    importProfile(profileLike: { device: CamDeviceConfig; tools: CamTool[]; process: CamProcessConfig }, name?: string) {
      const profile: CamProfile = {
        name: name || profileLike.process.processName || 'imported',
        device: clonePlain(profileLike.device) as CamDeviceConfig,
        tools: clonePlain(profileLike.tools) as CamTool[],
        process: clonePlain(profileLike.process) as CamProcessConfig,
      }
      this.upsertProfile(profile)
      const saved = this.profiles.find((p) => p.name === profile.name)
      if (saved) this.applyProfile(saved)
    },
    importProfileJson(jsonText: string) {
      const parsed = JSON.parse(jsonText) as Partial<CamProfile>

      const device = parsed.device
      const tools = parsed.tools
      const process = parsed.process

      if (!device || !tools || !process) {
        throw new Error('Invalid CAM profile JSON: expected { device, tools, process }')
      }

      const importName = (process as any).processName || `imported-${Date.now()}`
      this.importProfile({ device, tools, process }, importName)
    },
    exportProfileObject(): { device: CamDeviceConfig; tools: CamTool[]; process: CamProcessConfig } | null {
      if (!this.device || !this.process) return null
      return {
        device: clonePlain(this.device) as CamDeviceConfig,
        tools: clonePlain(this.tools) as CamTool[],
        process: canonicalizeCamProcessConfig(this.process as CamProcessConfig),
      }
    },
    exportProfile(): string {
      const obj = this.exportProfileObject()
      return JSON.stringify(obj, null, 2)
    },
    cloneFromCurrent(name: string) {
      if (!this.device || !this.process) return
      const profile: CamProfile = {
        name,
        device: clonePlain(this.device) as CamDeviceConfig,
        tools: clonePlain(this.tools) as CamTool[],
        process: clonePlain(this.process) as CamProcessConfig,
      }
      this.upsertProfile(profile)
    },
    deleteProfile(name: string) {
      const idx = this.profiles.findIndex((p) => p.name === name)
      if (idx < 0) return
      this.profiles.splice(idx, 1)
      if (this.selectedProfileName === name) {
        const next = this.profiles[0]
        this.selectedProfileName = next?.name ?? null
        if (next) this.applyProfile(next)
        else {
          this.device = null
          this.tools = []
          this.process = null
        }
      }
    },
  },
})
