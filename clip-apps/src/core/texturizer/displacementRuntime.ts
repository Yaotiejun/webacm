import { computeTriNormals } from './triNormals'
import { runDisplacementFaceScan } from './displacementFaceScan'
import { resolveMeshBounds } from './meshBounds'
import { resolveTextureAspectCorrection } from './textureAspect'
import { normalizeVec3Map } from './displacementAccumulators'
import { buildDisplacementStepContext } from './displacementStepContext'
import type { DisplacementVertexStepContext } from './displacementVertexStep'

export interface PrepareDisplacementRuntimeInput {
  src: Float32Array
  userExcludedMask: Uint8Array
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
  computeUV: DisplacementVertexStepContext['computeUV']
  getCachedGray: DisplacementVertexStepContext['getCachedGray']
  cubicMappingMode: number
  amplitude: number
  symmetricDisplacement: boolean
}

export interface PrepareDisplacementRuntimeResult {
  vertexCount: number
  displacementStepCtx: DisplacementVertexStepContext
}

export function resolveDisplacementNormals(input: {
  normals?: Float32Array
  subdivisionLevels: number
  decimationRatio: number
}): Float32Array | undefined {
  if (input.subdivisionLevels > 0 || input.decimationRatio < 0.999) return undefined
  return input.normals
}

export function prepareDisplacementRuntime(input: PrepareDisplacementRuntimeInput): PrepareDisplacementRuntimeResult {
  const triCount = Math.floor(input.src.length / 9)
  const triNormals = input.normals ? null : computeTriNormals(input.src)
  const scan = runDisplacementFaceScan({
    src: input.src,
    triCount,
    userExcludedMask: input.userExcludedMask,
    topAngleLimit: input.topAngleLimit,
    bottomAngleLimit: input.bottomAngleLimit,
    mappingMode: input.mappingMode,
    mappingBlend: input.mappingBlend,
    seamBandWidth: input.seamBandWidth,
    normals: input.normals,
    triNormals,
    posKey: input.posKey,
  })
  normalizeVec3Map(scan.smoothNrmMap)
  const bounds = resolveMeshBounds(input.src)
  const textureAspect = resolveTextureAspectCorrection(input.imgW, input.imgH)
  const settings = {
    mappingMode: input.mappingMode,
    scaleU: input.scaleU,
    scaleV: input.scaleV,
    offsetU: input.offsetU,
    offsetV: input.offsetV,
    rotation: input.rotationDeg,
    mappingBlend: input.mappingBlend,
    seamBandWidth: input.seamBandWidth,
    capAngle: input.capAngle,
    textureAspectU: textureAspect.textureAspectU,
    textureAspectV: textureAspect.textureAspectV,
  }
  const displacementStepCtx = buildDisplacementStepContext({
    triUserExcluded: scan.triUserExcluded,
    excludedPosSet: scan.excludedPosSet,
    posKey: input.posKey,
    smoothNrmMap: scan.smoothNrmMap,
    normals: input.normals,
    triNormals,
    zoneAreaMap: scan.zoneAreaMap,
    maskedFracMap: scan.maskedFracMap,
    getCachedGray: input.getCachedGray,
    sampleGray: input.sampleGray,
    computeUV: input.computeUV,
    mappingMode: input.mappingMode,
    cubicMappingMode: input.cubicMappingMode,
    uvFrequency: input.uvFrequency,
    cubicSettings: settings,
    minX: bounds.min.x,
    minY: bounds.min.y,
    minZ: bounds.min.z,
    maxDim: Math.max(bounds.size.x, bounds.size.y, bounds.size.z, 1e-6),
    rotRad: (input.rotationDeg ?? 0) * Math.PI / 180,
    bounds,
    amplitude: input.amplitude,
    symmetricDisplacement: input.symmetricDisplacement,
    bottomAngleLimit: input.bottomAngleLimit,
    topAngleLimit: input.topAngleLimit,
  })
  return {
    vertexCount: Math.max(1, Math.floor(input.src.length / 3)),
    displacementStepCtx,
  }
}
