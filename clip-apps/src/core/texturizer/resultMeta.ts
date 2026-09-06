import type { TexturizeResult } from '@/types/texturizer'
import type { DecimationEngine, DecimationSearchMeta } from './decimation'

export interface BuildStageTimingsInput {
  subdivisionMs: number
  displacementMs: number
  decimationMs: number
  totalMs: number
}

export function buildStageTimingsMs(input: BuildStageTimingsInput): NonNullable<TexturizeResult['meta']>['stageTimingsMs'] {
  return {
    subdivision: Number(input.subdivisionMs.toFixed(2)),
    displacement: Number(input.displacementMs.toFixed(2)),
    decimation: Number(input.decimationMs.toFixed(2)),
    total: Number(input.totalMs.toFixed(2)),
  }
}

export function buildTexturizeSummary(vertices: Float32Array, minDz: number, maxDz: number): TexturizeResult['summary'] {
  return {
    vertexCount: vertices.length / 3,
    minDeltaZ: minDz,
    maxDeltaZ: maxDz,
  }
}

export interface BuildTexturizeResultInput {
  vertices: Float32Array
  minDz: number
  maxDz: number
  warnings: NonNullable<TexturizeResult['warnings']>
  preTriCount: number
  postSubdivTriCount: number
  postDecimateTriCount: number
  subdivSafetyCapHit: boolean
  stageTimingsMs: NonNullable<TexturizeResult['meta']>['stageTimingsMs']
  decimationEngine?: DecimationEngine
  decimationSearchMeta?: DecimationSearchMeta
}

export function buildTexturizeResult(input: BuildTexturizeResultInput): TexturizeResult {
  return {
    kind: 'result',
    vertices: input.vertices,
    summary: buildTexturizeSummary(input.vertices, input.minDz, input.maxDz),
    warnings: input.warnings,
    meta: {
      preTriCount: input.preTriCount,
      postSubdivTriCount: input.postSubdivTriCount,
      postDecimateTriCount: input.postDecimateTriCount,
      subdivSafetyCapHit: input.subdivSafetyCapHit,
      stageTimingsMs: input.stageTimingsMs,
      decimationEngine: input.decimationEngine,
      decimationSearchMeta: input.decimationSearchMeta,
    },
  }
}
