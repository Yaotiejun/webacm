import { TEXTURIZER_WARNING_CODES, TEXTURIZER_WARNING_DETAIL_KEYS } from '@/types/texturizerWarnings'
import type { DecimationEngine, DecimationSearchMeta } from '@/core/texturizer/decimation'

export interface TexturizeRequest {
  // positions as flat [x,y,z,...]
  vertices: Float32Array
  normals?: Float32Array
  amplitude: number
  frequency: number

  // optional grayscale texture (row-major 0-255)
  texture?: {
    width: number
    height: number
    gray: Uint8Array
  }

  // Legacy mapping/displacement settings (optional; will use worker defaults)
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
}

export interface TexturizeResultSummary {
  vertexCount: number
  minDeltaZ: number
  maxDeltaZ: number
}

export type TexturizerRunStage = 'subdivision' | 'displacement' | 'decimation' | 'finalize'

export interface TexturizerProgressEvent {
  kind: 'progress'
  stage: TexturizerRunStage
  progress: number
  message?: string
}

export interface SubdivSafetyCapHitWarning {
  code: typeof TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT
  level: 'error'
  message?: string
  details?: {
    [TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.SAFETY_TRIANGLES]?: number
    [TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.POST_SUBDIV_TRI_COUNT]?: number
  }
}

export interface DecimationStrongerThanRequestedWarning {
  code: typeof TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED
  level: 'warning'
  message?: string
  details?: {
    [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.REQUESTED_RATIO]?: number
    [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.KEPT_RATIO]?: number
    [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.PRE_TRI_COUNT]?: number
    [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.POST_TRI_COUNT]?: number
  }
}

export type LegacyWarningCode = `legacy_${string}`
export type UnknownWarningCode = `unknown_${string}`

export interface GenericTexturizeWarning {
  code: LegacyWarningCode | UnknownWarningCode
  level: 'warning' | 'error'
  message?: string
  details?: Record<string, number | string | boolean>
}

export type TexturizeWarning =
  | SubdivSafetyCapHitWarning
  | DecimationStrongerThanRequestedWarning
  | GenericTexturizeWarning

export interface TexturizeResult {
  kind?: 'result'
  vertices: Float32Array
  summary: TexturizeResultSummary
  warnings?: TexturizeWarning[]
  meta?: {
    preTriCount: number
    postSubdivTriCount: number
    postDecimateTriCount: number
    subdivSafetyCapHit: boolean
    stageTimingsMs?: {
      subdivision: number
      displacement: number
      decimation: number
      total: number
    }
    decimationEngine?: DecimationEngine
    decimationSearchMeta?: DecimationSearchMeta
  }
}
