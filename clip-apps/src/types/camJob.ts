import type { CamDeviceConfig, CamTool, CamProcessConfig, CamOperationInstance } from '@/types/cam'

export interface CamProfile {
  device: CamDeviceConfig
  tools: CamTool[]
  process: CamProcessConfig
}

export interface CamJobInputGeometry {
  id: string
  bbox: {
    minX: number
    minY: number
    minZ: number
    maxX: number
    maxY: number
    maxZ: number
  }
  /** Non-indexed STL triangles (x,y,z interleaved), for legacy `cam_slice` mesh. */
  vertices?: Float32Array
  complexityHint?: number
}

export interface CamOpStepSummary {
  opIndex: number
  type: CamOperationInstance['type']
  toolId: number | null
  estimatedPasses: number
  estimatedPathSegments: number
}

export interface CamJobSummary {
  opCount: number
  toolCountUsed: number
  estimatedTotalPasses: number
  estimatedTotalPathSegments: number
  estimatedMachiningTimeMinutes: number
}

export type CamFallbackReasonCode =
  | 'legacy_disabled'
  | 'runtime_init_error'
  | 'runtime_not_ready'
  | 'legacy_impl_missing_both'
  | 'legacy_impl_missing_slice'
  | 'legacy_impl_missing_export'
  | 'legacy_unknown'

export interface CamLegacyDebugSnapshot {
  ready: boolean
  initErrorMessage: string | null
  hasSlice: boolean
  hasExport: boolean
  legacyImportErrorMessage: string | null
}

export interface CamJobResult {
  backend: 'cam-placeholder' | 'kiri-cam' | 'kiri-cam-slice-only'
  profileName: string | null
  deviceName: string
  processName: string
  stockSize: { x: number; y: number; z: number } | null
  zSettings: {
    anchor: CamProcessConfig['camZAnchor'] | null
    bottom: number | null
    clearance: number | null
  }
  summary: CamJobSummary
  perOp: CamOpStepSummary[]
  notes: string[]
  /** Legacy CAM runtime snapshot (migration parity / diagnostics). */
  legacyDebug?: CamLegacyDebugSnapshot
  fallback?: {
    reasonCode: CamFallbackReasonCode
    message: string
  } | null
  gcodeText?: string
}
