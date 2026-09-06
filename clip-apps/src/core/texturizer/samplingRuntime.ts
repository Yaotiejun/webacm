import { sampleGrayBilinear } from './textureSampling'
import { makeComputeUvAdapter } from './computeUvAdapter'
import { resolveCachedGray } from './displacementSampling'
import type { DisplacementVertexStepContext } from './displacementVertexStep'

export interface BuildSamplingRuntimeInput {
  imgW: number
  imgH: number
  imgGray: Uint8Array
  computeUvLegacy: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: any,
    bounds: any,
  ) => unknown
}

export interface SamplingRuntime {
  sampleGray: (u: number, v: number) => number
  computeUV: DisplacementVertexStepContext['computeUV']
  getCachedGray: (key: string, compute: () => number) => number
}

export function buildSamplingRuntime(input: BuildSamplingRuntimeInput): SamplingRuntime {
  const dispCache = new Map<string, number>()
  return {
    sampleGray: (u: number, v: number) => sampleGrayBilinear({ width: input.imgW, height: input.imgH, gray: input.imgGray }, u, v),
    computeUV: makeComputeUvAdapter(input.computeUvLegacy),
    getCachedGray: (key: string, compute: () => number) => resolveCachedGray(dispCache, key, compute),
  }
}
