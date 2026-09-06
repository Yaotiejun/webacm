import type { Vec3Map } from './displacementAccumulators'
import type { MaskedFractionMap } from './maskedFraction'
import { resolveMaskedFraction } from './maskedFraction'
import { resolveVertexNormal } from './displacementNormal'
import { resolveVertexGrey01 } from './displacementGreyResolve'
import { resolveVertexDisplacement } from './displacementVertex'
import type { CubicUvSettings } from './cubicUv'

export interface DisplacementVertexStepContext {
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
  computeUV: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: unknown,
    bounds: unknown,
  ) => unknown
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

export interface DisplacementVertexStepOutput {
  x: number
  y: number
  z: number
  nz: number
  dz: number
}

export function stepDisplacementVertex(
  src: Float32Array,
  i: number,
  ctx: DisplacementVertexStepContext,
): DisplacementVertexStepOutput {
  const x = src[i] ?? 0
  const y = src[i + 1] ?? 0
  const z = src[i + 2] ?? 0
  const triIdx = Math.floor(i / 9)
  const key = ctx.posKey(x, y, z)

  const normal = resolveVertexNormal({
    key,
    triIdx,
    vertexOffset: i,
    smoothNrmMap: ctx.smoothNrmMap,
    normals: ctx.normals,
    triNormals: ctx.triNormals,
  })

  const grey = ctx.getCachedGray(key, () =>
    resolveVertexGrey01({
      mappingMode: ctx.mappingMode,
      cubicMappingMode: ctx.cubicMappingMode,
      zoneAreas: ctx.zoneAreaMap.get(key),
      cubicSampleBase: {
        point: { x, y, z },
        normal,
        minX: ctx.minX,
        minY: ctx.minY,
        minZ: ctx.minZ,
        maxDim: ctx.maxDim,
        rotRad: ctx.rotRad,
        uvFrequency: ctx.uvFrequency,
        settings: ctx.cubicSettings,
      },
      sampleGray: ctx.sampleGray,
      computeUV: ctx.computeUV,
      uvPoint: { x, y, z },
      uvNormal: normal,
      uvSettings: ctx.cubicSettings,
      uvBounds: ctx.bounds,
    }),
  )

  const maskedFrac = resolveMaskedFraction(ctx.maskedFracMap, key)
  const isFaceExcluded = ctx.triUserExcluded[triIdx] === 1
  const isSealedBoundary = !isFaceExcluded && ctx.excludedPosSet.has(key)
  const { dz, nz } = resolveVertexDisplacement({
    z,
    grey01: grey,
    amplitude: ctx.amplitude,
    symmetricDisplacement: ctx.symmetricDisplacement,
    maskedFrac,
    isFaceExcluded,
    isSealedBoundary,
    bottomAngleLimit: ctx.bottomAngleLimit,
    topAngleLimit: ctx.topAngleLimit,
  })
  return { x, y, z, nz, dz }
}
