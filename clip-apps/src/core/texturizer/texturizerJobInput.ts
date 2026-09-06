import type { TexturizeRequest, TexturizerRunStage } from '@/types/texturizer'
import { resolveTexturizerParams } from './texturizerParams'
import { resolveTextureInput } from './textureInput'
import { buildSamplingRuntime } from './samplingRuntime'
import { posKey } from './positionKey'
import type { RunTexturizerPipelineInput } from './texturizerPipeline'

export interface BuildTexturizerPipelineInputArgs {
  req: TexturizeRequest
  defaultCubicMode: number
  computeUvLegacy: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: any,
    bounds: any,
  ) => unknown
  onProgress?: (stage: TexturizerRunStage, progress: number, message?: string) => void
}

export function buildTexturizerPipelineInput(args: BuildTexturizerPipelineInputArgs): RunTexturizerPipelineInput {
  const params = resolveTexturizerParams(args.req, args.defaultCubicMode)
  const textureInput = resolveTextureInput(args.req.texture)
  const sampling = buildSamplingRuntime({
    imgW: textureInput.width,
    imgH: textureInput.height,
    imgGray: textureInput.gray,
    computeUvLegacy: args.computeUvLegacy,
  })
  return {
    vertices: args.req.vertices,
    excludedFaces: params.excludedFaces,
    exclusionMode: params.exclusionMode,
    subdivisionLevels: params.subdivisionLevels,
    decimationRatio: params.decimationRatio,
    normals: args.req.normals,
    topAngleLimit: params.topAngleLimit,
    bottomAngleLimit: params.bottomAngleLimit,
    mappingMode: params.mappingMode,
    mappingBlend: params.mappingBlend,
    seamBandWidth: params.seamBandWidth,
    posKey,
    imgW: textureInput.width,
    imgH: textureInput.height,
    scaleU: params.scaleU,
    scaleV: params.scaleV,
    offsetU: params.offsetU,
    offsetV: params.offsetV,
    rotationDeg: params.rotationDeg,
    capAngle: params.capAngle,
    uvFrequency: params.uvFrequency,
    sampleGray: sampling.sampleGray,
    computeUV: sampling.computeUV,
    getCachedGray: sampling.getCachedGray,
    cubicMappingMode: args.defaultCubicMode,
    amplitude: params.amplitude,
    symmetricDisplacement: params.symmetricDisplacement,
    onProgress: args.onProgress,
  }
}
