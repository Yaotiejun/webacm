export const TEXTURIZER_WARNING_CODES = {
  SUBDIV_SAFETY_CAP_HIT: 'subdiv_safety_cap_hit',
  DECIMATION_STRONGER_THAN_REQUESTED: 'decimation_stronger_than_requested',
} as const

export const TEXTURIZER_WARNING_DETAIL_KEYS = {
  SUBDIV: {
    SAFETY_TRIANGLES: 'subdivSafetyTriangles',
    POST_SUBDIV_TRI_COUNT: 'postSubdivTriCount',
  },
  DECIMATION: {
    REQUESTED_RATIO: 'requestedRatio',
    KEPT_RATIO: 'keptRatio',
    PRE_TRI_COUNT: 'preTriCount',
    POST_TRI_COUNT: 'postTriCount',
  },
} as const

export const TEXTURIZER_WARNING_MESSAGE_MAP: Record<string, string> = {
  [TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT]: '细分触发安全上限，结果可能不完整',
  [TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED]: '简化比预期更强，三角面减少较多',
}
