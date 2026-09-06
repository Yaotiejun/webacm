import { buildCubicZoneWeightedSamples, type CubicZoneSampleContext } from './cubicZoneSampling'
import { accumulateWeightedGray } from './displacementSampling'
import { sampleMappedGray, type MappedUvPayload } from './mappedGraySampling'

export interface ResolveVertexGrey01Input {
  mappingMode: number
  /** Pass `MODE_CUBIC` from legacy mapping so core stays free of that import. */
  cubicMappingMode: number
  zoneAreas: [number, number, number] | undefined
  cubicSampleBase: Omit<CubicZoneSampleContext, 'zoneAreas'>
  sampleGray: (u: number, v: number) => number
  computeUV: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: unknown,
    bounds: unknown,
  ) => unknown
  uvPoint: { x: number; y: number; z: number }
  uvNormal: { x: number; y: number; z: number }
  uvSettings: unknown
  uvBounds: unknown
}

/**
 * Per-vertex grayscale in [0,1]: cubic zone-area weighted samples when applicable,
 * otherwise legacy `computeUV` + mapped sampling (triplanar or planar).
 */
export function resolveVertexGrey01(input: ResolveVertexGrey01Input): number {
  const {
    mappingMode,
    cubicMappingMode,
    zoneAreas,
    cubicSampleBase,
    sampleGray,
    computeUV,
    uvPoint,
    uvNormal,
    uvSettings,
    uvBounds,
  } = input

  if (mappingMode === cubicMappingMode && zoneAreas) {
    const samples = buildCubicZoneWeightedSamples({
      ...cubicSampleBase,
      zoneAreas,
    })
    if (samples && samples.length > 0) {
      return accumulateWeightedGray(samples, sampleGray)
    }
  }

  const uv = computeUV(uvPoint, uvNormal, mappingMode, uvSettings, uvBounds) as MappedUvPayload | undefined
  return sampleMappedGray(uv, cubicSampleBase.uvFrequency, sampleGray)
}
