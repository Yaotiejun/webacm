import { defineStore } from 'pinia'
import type { RasterRequest, RasterResult, RasterConfig, RasterMode } from '@/types/raster'
import { runRaster } from '@/api/raster'
import { clonePlain } from '@/core/clonePlain'
import { saveRasterLastRunMeta } from '@/core/raster/rasterLastRunPersist'

export interface RasterRecentJob {
  id: string
  createdAt: number
  name: string
  input: {
    width?: number
    height?: number
    terrainVertexCount?: number
    toolVertexCount?: number
    config: RasterConfig
  }
  summary: RasterResult['summary']
  paths: RasterResult['paths']
}

interface RasterState {
  config: RasterConfig
  currentRequest: RasterRequest | null
  result: RasterResult | null
  running: boolean
  runPhase: string
  runPercent: number
  error: string | null
  recentJobs: RasterRecentJob[]
}

export const useRasterStore = defineStore('raster', {
  state: (): RasterState => ({
    config: {
      mode: 'planar',
      resolution: 0.5,
      rotationStep: 5,
      xStep: 5,
      yStep: 5,
      zFloor: -100,
      tracingStep: 1,
    },
    currentRequest: null,
    result: null,
    running: false,
    runPhase: '',
    runPercent: 0,
    error: null,
    recentJobs: [],
  }),
  actions: {
    loadRecentJobs() {
      try {
        const raw = localStorage.getItem('ws-raster-recent-jobs')
        if (!raw) {
          this.recentJobs = []
          return
        }
        const parsed = JSON.parse(raw)
        this.recentJobs = Array.isArray(parsed) ? (clonePlain(parsed) as RasterRecentJob[]) : []
      } catch {
        this.recentJobs = []
      }
    },
    saveRecentJobs() {
      localStorage.setItem('ws-raster-recent-jobs', JSON.stringify(this.recentJobs.slice(0, 20)))
    },
    addRecentJob(job: RasterRecentJob) {
      this.recentJobs = [clonePlain(job), ...this.recentJobs.filter((j) => j.id !== job.id)].slice(0, 20)
      this.saveRecentJobs()
    },
    clearRecentJobs() {
      this.recentJobs = []
      this.saveRecentJobs()
    },
    setMode(mode: RasterMode) {
      this.config.mode = mode
    },
    setConfig(patch: Partial<RasterConfig>) {
      this.config = { ...this.config, ...patch }
    },
    async runRaster(request: RasterRequest) {
      if (this.running) return
      const isolated = clonePlain(request) as RasterRequest
      this.currentRequest = isolated
      this.running = true
      this.runPhase = 'start'
      this.runPercent = 0
      this.error = null
      this.result = null
      try {
        const res = await runRaster(isolated, {
          onProgress: (phase, percent) => {
            this.runPhase = phase
            this.runPercent = Math.round(Math.min(1, Math.max(0, percent)) * 100)
          },
        })
        this.result = clonePlain(res) as RasterResult
        this.runPercent = 100
        const tv = isolated.terrainTriangles.length / 3
        const toolv = isolated.toolTriangles.length / 3
        saveRasterLastRunMeta(this.config, this.result.summary, tv, toolv)
      } catch (e: any) {
        this.error = e?.message ?? String(e)
      } finally {
        this.running = false
        this.runPhase = ''
      }
    },
  },
})
