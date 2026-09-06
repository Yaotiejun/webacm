import { defineStore } from 'pinia'
import type { TexturizeRequest, TexturizeResult, TexturizeWarning } from '@/types/texturizer'
import { runTexturizer } from '@/api/texturizer'
import { clonePlain } from '@/core/clonePlain'
import { toTexturizerOverallProgress } from '@/core/texturizer/texturizerOverallProgress'

export interface TexturizerRecentJob {
  id: string
  createdAt: number
  name: string
  input: {
    vertexCount: number
    amplitude: number
    frequency: number
    mappingMode?: number
    scaleU?: number
    scaleV?: number
    offsetU?: number
    offsetV?: number
    rotationDeg?: number
    mappingBlend?: number
    seamBandWidth?: number
    capAngle?: number
    topAngleLimit?: number
    bottomAngleLimit?: number
    exclusionMode?: 'exclude' | 'include'
    excludedFaces?: number[]
    subdivisionLevels?: number
    decimationRatio?: number
    symmetricDisplacement?: boolean
    texture: { width: number; height: number }
  }
  summary: TexturizeResult['summary']
  meta?: TexturizeResult['meta']
  warnings?: Array<TexturizeWarning | string>
  vertices: number[]
}

interface TexturizerState {
  currentRequest: TexturizeRequest | null
  result: TexturizeResult | null
  running: boolean
  runStage: string
  runPercent: number
  runProgressMessage: string
  error: string | null
  recentJobs: TexturizerRecentJob[]
}

export const useTexturizerStore = defineStore('texturizer', {
  state: (): TexturizerState => ({
    currentRequest: null,
    result: null,
    running: false,
    runStage: '',
    runPercent: 0,
    runProgressMessage: '',
    error: null,
    recentJobs: [],
  }),
  actions: {
    loadRecentJobs() {
      try {
        const raw = localStorage.getItem('ws-texturizer-recent-jobs')
        if (!raw) {
          this.recentJobs = []
          return
        }
        const parsed = JSON.parse(raw)
        this.recentJobs = Array.isArray(parsed) ? (clonePlain(parsed) as TexturizerRecentJob[]) : []
      } catch {
        this.recentJobs = []
      }
    },
    saveRecentJobs() {
      localStorage.setItem('ws-texturizer-recent-jobs', JSON.stringify(this.recentJobs.slice(0, 20)))
    },
    addRecentJob(job: TexturizerRecentJob) {
      this.recentJobs = [clonePlain(job), ...this.recentJobs.filter((j) => j.id !== job.id)].slice(0, 20)
      this.saveRecentJobs()
    },
    clearRecentJobs() {
      this.recentJobs = []
      this.saveRecentJobs()
    },
    async runTexturizer(request: TexturizeRequest) {
      if (this.running) return
      const isolated = clonePlain(request) as TexturizeRequest
      this.currentRequest = isolated
      this.running = true
      this.runStage = 'start'
      this.runPercent = 0
      this.runProgressMessage = ''
      this.error = null
      this.result = null
      try {
        const res = await runTexturizer(isolated, {
          onProgress: (ev) => {
            this.runStage = ev.stage
            this.runProgressMessage = ev.message ?? ''
            this.runPercent = Math.round(toTexturizerOverallProgress(ev.stage, ev.progress) * 100)
          },
        })
        this.result = clonePlain(res) as TexturizeResult
        this.runPercent = 100
      } catch (e: any) {
        this.error = e?.message ?? String(e)
      } finally {
        this.running = false
        this.runStage = ''
        this.runProgressMessage = ''
      }
    },
  },
})
