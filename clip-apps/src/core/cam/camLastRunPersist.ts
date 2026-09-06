import type { CamJobInputGeometry, CamJobResult } from '@/types/camJob'
import { serializeCamJobGeometry, hydrateCamJobGeometry } from '@/core/cam/camGeometryPersist'
import { clonePlain } from '@/core/clonePlain'

const STORAGE_KEY = 'ws-cam-last-run-preview'
/** Max gcode bytes stored for instant preview restore on next visit. */
export const CAM_LAST_RUN_GCODE_MAX_CHARS = 200_000

export interface CamLastRunPreviewSnapshot {
  savedAt: number
  backend: CamJobResult['backend']
  gcodeText: string
  geometry: ReturnType<typeof serializeCamJobGeometry>
}

export function saveCamLastRunPreview(result: CamJobResult, geometry: CamJobInputGeometry): void {
  const text = result.gcodeText?.trim() ?? ''
  if (!text || text.length > CAM_LAST_RUN_GCODE_MAX_CHARS) return
  const snap: CamLastRunPreviewSnapshot = {
    savedAt: Date.now(),
    backend: result.backend,
    gcodeText: text,
    geometry: serializeCamJobGeometry(geometry),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap))
  } catch {
    // quota exceeded — skip
  }
}

export function loadCamLastRunPreview(): {
  geometry: CamJobInputGeometry
  result: CamJobResult
} | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const snap = JSON.parse(raw) as CamLastRunPreviewSnapshot
    if (!snap?.gcodeText || !snap.geometry) return null
    const geometry = hydrateCamJobGeometry(snap.geometry)
    const result = clonePlain({
      backend: snap.backend,
      gcodeText: snap.gcodeText,
      profileName: null,
      deviceName: null,
      processName: null,
      stockSize: null,
      zSettings: { anchor: null, bottom: null, clearance: null },
      summary: { opCount: 0, toolCountUsed: 0, estimatedTotalPasses: 0, estimatedTotalPathSegments: 0, estimatedMachiningTimeMinutes: 0 },
      perOp: [],
      notes: ['restored from last CAM run preview cache'],
      legacyDebug: null,
      fallback: null,
    }) as CamJobResult
    return { geometry, result }
  } catch {
    return null
  }
}

export function clearCamLastRunPreview(): void {
  localStorage.removeItem(STORAGE_KEY)
}
