import type { TexturizeResult } from '@/types/texturizer'
import type { DecimationEngine, DecimationSearchMeta } from './decimation'
import { buildRuntimeWarnings } from './warningRuntime'
import { buildStageTimingsMs, buildTexturizeResult } from './resultMeta'

export interface RunFinalizePassInput {
  vertices: Float32Array
  minDz: number
  maxDz: number
  preTriCount: number
  postSubdivTriCount: number
  subdivSafetyCapHit: boolean
  decimationRatio: number
  subdivisionMs: number
  displacementMs: number
  decimationMs: number
  totalMs: number
  decimationEngine?: DecimationEngine
  decimationSearchMeta?: DecimationSearchMeta
}

export interface RunFinalizePassResult {
  result: TexturizeResult
  postDecimateTriCount: number
}

export function runFinalizePass(input: RunFinalizePassInput): RunFinalizePassResult {
  const postDecimateTriCount = Math.floor(input.vertices.length / 9)
  const warnings = buildRuntimeWarnings({
    subdivSafetyCapHit: input.subdivSafetyCapHit,
    postSubdivTriCount: input.postSubdivTriCount,
    postDecimateTriCount,
    decimationRatio: input.decimationRatio,
  })
  const result = buildTexturizeResult({
    vertices: input.vertices,
    minDz: input.minDz,
    maxDz: input.maxDz,
    warnings,
    preTriCount: input.preTriCount,
    postSubdivTriCount: input.postSubdivTriCount,
    postDecimateTriCount,
    subdivSafetyCapHit: input.subdivSafetyCapHit,
    stageTimingsMs: buildStageTimingsMs({
      subdivisionMs: input.subdivisionMs,
      displacementMs: input.displacementMs,
      decimationMs: input.decimationMs,
      totalMs: input.totalMs,
    }),
    decimationEngine: input.decimationEngine,
    decimationSearchMeta: input.decimationSearchMeta,
  })
  return { result, postDecimateTriCount }
}
