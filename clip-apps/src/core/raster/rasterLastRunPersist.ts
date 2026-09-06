import type { RasterConfig, RasterResultSummary } from '@/types/raster'
import { clonePlain } from '@/core/clonePlain'

const STORAGE_KEY = 'ws-raster-last-run-meta'

export interface RasterLastRunMeta {
  savedAt: number
  config: RasterConfig
  summary: RasterResultSummary
  terrainVertexCount: number
  toolVertexCount: number
}

export function saveRasterLastRunMeta(
  config: RasterConfig,
  summary: RasterResultSummary,
  terrainVertexCount: number,
  toolVertexCount: number,
): void {
  const snap: RasterLastRunMeta = {
    savedAt: Date.now(),
    config: clonePlain(config),
    summary: clonePlain(summary),
    terrainVertexCount,
    toolVertexCount,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // quota
  }
}

export function loadRasterLastRunMeta(): RasterLastRunMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as RasterLastRunMeta
    if (!snap?.config || !snap.summary) return null
    return snap
  } catch {
    return null
  }
}

export function clearRasterLastRunMeta(): void {
  localStorage.removeItem(STORAGE_KEY)
}
