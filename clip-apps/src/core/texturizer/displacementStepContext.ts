import type { Vec3Map } from './displacementAccumulators'
import type { MaskedFractionMap } from './maskedFraction'
import type { CubicUvSettings } from './cubicUv'
import type { DisplacementVertexStepContext } from './displacementVertexStep'

export interface BuildDisplacementStepContextInput {
  triUserExcluded: Uint8Array
  excludedPosSet: Set<string>
  posKey: (x: number, y: number, z: number) => string
  smoothNrmMap: Vec3Map
  normals?: Float32Array
  triNormals?: Float32Array | null
  zoneAreaMap: Vec3Map
  maskedFracMap: MaskedFractionMap
  getCachedGray: (key: string, compute: () => number) => number
  sampleGray: (u: number, v: number) => number
  computeUV: DisplacementVertexStepContext['computeUV']
  mappingMode: number
  cubicMappingMode: number
  uvFrequency: number
  cubicSettings: CubicUvSettings
  minX: number
  minY: number
  minZ: number
  maxDim: number
  rotRad: number
  bounds: unknown
  amplitude: number
  symmetricDisplacement: boolean
  bottomAngleLimit: number
  topAngleLimit: number
}

export function buildDisplacementStepContext(input: BuildDisplacementStepContextInput): DisplacementVertexStepContext {
  return {
    triUserExcluded: input.triUserExcluded,
    excludedPosSet: input.excludedPosSet,
    posKey: input.posKey,
    smoothNrmMap: input.smoothNrmMap,
    normals: input.normals,
    triNormals: input.triNormals,
    zoneAreaMap: input.zoneAreaMap,
    maskedFracMap: input.maskedFracMap,
    getCachedGray: input.getCachedGray,
    sampleGray: input.sampleGray,
    computeUV: input.computeUV,
    mappingMode: input.mappingMode,
    cubicMappingMode: input.cubicMappingMode,
    uvFrequency: input.uvFrequency,
    cubicSettings: input.cubicSettings,
    minX: input.minX,
    minY: input.minY,
    minZ: input.minZ,
    maxDim: input.maxDim,
    rotRad: input.rotRad,
    bounds: input.bounds,
    amplitude: input.amplitude,
    symmetricDisplacement: input.symmetricDisplacement,
    bottomAngleLimit: input.bottomAngleLimit,
    topAngleLimit: input.topAngleLimit,
  }
}
