import type { TexturizeResult, TexturizerRunStage } from '@/types/texturizer'
import { runSubdivisionPass } from './subdivisionPass'
import { buildUserExcludedTriMask } from './exclusionMask'
import { ensureUserExcludedTriMaskLength } from './exclusionMask'
import { resolveDisplacementNormals, prepareDisplacementRuntime } from './displacementRuntime'
import { runDisplacementPass } from './displacementPass'
import { runDecimationPass } from './decimationPass'
import { runFinalizePass } from './finalizePass'

export interface RunTexturizerPipelineInput {
  vertices: Float32Array
  excludedFaces: number[]
  exclusionMode: 'exclude' | 'include'
  subdivisionLevels: number
  decimationRatio: number
  normals?: Float32Array
  topAngleLimit: number
  bottomAngleLimit: number
  mappingMode: number
  mappingBlend: number
  seamBandWidth: number
  posKey: (x: number, y: number, z: number) => string
  imgW: number
  imgH: number
  scaleU: number
  scaleV: number
  offsetU: number
  offsetV: number
  rotationDeg: number
  capAngle: number
  uvFrequency: number
  sampleGray: (u: number, v: number) => number
  computeUV: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: unknown,
    bounds: unknown,
  ) => unknown
  getCachedGray: (key: string, compute: () => number) => number
  cubicMappingMode: number
  amplitude: number
  symmetricDisplacement: boolean
  onProgress?: (stage: TexturizerRunStage, progress: number, message?: string) => void
}

export function runTexturizerPipeline(input: RunTexturizerPipelineInput): TexturizeResult {
  const t0 = performance.now()
  let src = input.vertices
  const preTriCount = Math.floor(src.length / 9)
  let userExcludedMask = buildUserExcludedTriMask(preTriCount, input.excludedFaces, input.exclusionMode)

  input.onProgress?.('subdivision', 0.02, '开始细分阶段')
  const subdiv = runSubdivisionPass({
    vertices: src,
    levels: input.subdivisionLevels,
    triExcluded: userExcludedMask,
    onProgress: (p) => input.onProgress?.('subdivision', p, '细分计算中'),
  })
  src = subdiv.vertices
  userExcludedMask = subdiv.triExcluded
  const subdivisionMs = subdiv.elapsedMs
  const subdivSafetyCapHit = subdiv.safetyCapHit
  input.onProgress?.('subdivision', 1, '细分阶段完成')

  const postSubdivTriCount = Math.floor(src.length / 9)
  const out = new Float32Array(src.length)
  const triCount = Math.floor(src.length / 9)
  userExcludedMask = ensureUserExcludedTriMaskLength({
    triCount,
    currentMask: userExcludedMask,
    excludedFaces: input.excludedFaces,
    exclusionMode: input.exclusionMode,
  })
  const normals = resolveDisplacementNormals({
    normals: input.normals,
    subdivisionLevels: input.subdivisionLevels,
    decimationRatio: input.decimationRatio,
  })

  input.onProgress?.('displacement', 0.02, '开始位移阶段')
  const tDisplacementStart = performance.now()
  const prepared = prepareDisplacementRuntime({
    src,
    userExcludedMask,
    normals,
    topAngleLimit: input.topAngleLimit,
    bottomAngleLimit: input.bottomAngleLimit,
    mappingMode: input.mappingMode,
    mappingBlend: input.mappingBlend,
    seamBandWidth: input.seamBandWidth,
    posKey: input.posKey,
    imgW: input.imgW,
    imgH: input.imgH,
    scaleU: input.scaleU,
    scaleV: input.scaleV,
    offsetU: input.offsetU,
    offsetV: input.offsetV,
    rotationDeg: input.rotationDeg,
    capAngle: input.capAngle,
    uvFrequency: input.uvFrequency,
    sampleGray: input.sampleGray,
    computeUV: input.computeUV,
    getCachedGray: input.getCachedGray,
    cubicMappingMode: input.cubicMappingMode,
    amplitude: input.amplitude,
    symmetricDisplacement: input.symmetricDisplacement,
  })
  const { minDz, maxDz } = runDisplacementPass({
    src,
    out,
    ctx: prepared.displacementStepCtx,
    vertexCount: prepared.vertexCount,
    onProgress: (p) => input.onProgress?.('displacement', p, '位移计算中'),
  })
  const displacementMs = performance.now() - tDisplacementStart
  input.onProgress?.('displacement', 1, '位移阶段完成')

  input.onProgress?.('decimation', 0.02, '开始简化阶段')
  const decimated = runDecimationPass({
    vertices: out,
    decimationRatio: input.decimationRatio,
    onProgress: (p) => input.onProgress?.('decimation', p, '简化计算中'),
  })
  input.onProgress?.('decimation', 1, '简化阶段完成')

  input.onProgress?.('finalize', 0.2, '汇总阶段计时')
  const totalMs = performance.now() - t0
  const finalized = runFinalizePass({
    vertices: decimated.vertices,
    minDz,
    maxDz,
    preTriCount,
    postSubdivTriCount,
    subdivSafetyCapHit,
    decimationRatio: input.decimationRatio,
    subdivisionMs,
    displacementMs,
    decimationMs: decimated.elapsedMs,
    totalMs,
    decimationEngine: decimated.engine,
    decimationSearchMeta: decimated.searchMeta,
  })
  input.onProgress?.('finalize', 0.55, '组装结果与告警')
  input.onProgress?.('finalize', 1, '结果输出完成')
  return finalized.result
}
