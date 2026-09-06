import type {
  DecimationStrongerThanRequestedWarning,
  SubdivSafetyCapHitWarning,
} from '@/types/texturizer'
import { TEXTURIZER_WARNING_CODES, TEXTURIZER_WARNING_DETAIL_KEYS } from '@/types/texturizerWarnings'

export function createSubdivSafetyCapHitWarning(
  postSubdivTriCount?: number,
  subdivSafetyTriangles?: number,
): SubdivSafetyCapHitWarning {
  const details: NonNullable<SubdivSafetyCapHitWarning['details']> = {}
  if (typeof subdivSafetyTriangles === 'number' && Number.isFinite(subdivSafetyTriangles)) {
    details[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.SAFETY_TRIANGLES] = subdivSafetyTriangles
  }
  if (typeof postSubdivTriCount === 'number' && Number.isFinite(postSubdivTriCount)) {
    details[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.POST_SUBDIV_TRI_COUNT] = postSubdivTriCount
  }
  return {
    code: TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT,
    level: 'error',
    details: Object.keys(details).length > 0 ? details : undefined,
  }
}

export function createDecimationStrongerThanRequestedWarning(
  requestedRatio: number,
  keptRatio: number,
  preTriCount: number,
  postTriCount: number,
): DecimationStrongerThanRequestedWarning {
  return {
    code: TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED,
    level: 'warning',
    details: {
      [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.REQUESTED_RATIO]: Number(requestedRatio.toFixed(4)),
      [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.KEPT_RATIO]: Number(keptRatio.toFixed(4)),
      [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.PRE_TRI_COUNT]: preTriCount,
      [TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.POST_TRI_COUNT]: postTriCount,
    },
  }
}
