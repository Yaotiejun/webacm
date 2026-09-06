import { accumulateTuple, accumulateVec3Weighted, type Vec3Map } from './displacementAccumulators'
import { accumulateMaskedFraction, type MaskedFractionMap } from './maskedFraction'
import { resolveCubicZoneAreaContribution } from './cubicZoneArea'

export interface DisplacementFaceScanInput {
  src: Float32Array
  triCount: number
  userExcludedMask: Uint8Array
  topAngleLimit: number
  bottomAngleLimit: number
  mappingMode: number
  mappingBlend: number
  seamBandWidth: number
  normals?: Float32Array
  triNormals?: Float32Array | null
  posKey: (x: number, y: number, z: number) => string
}

export interface DisplacementFaceScanOutput {
  triUserExcluded: Uint8Array
  maskedFracMap: MaskedFractionMap
  smoothNrmMap: Vec3Map
  zoneAreaMap: Vec3Map
  excludedPosSet: Set<string>
}

export function runDisplacementFaceScan(input: DisplacementFaceScanInput): DisplacementFaceScanOutput {
  const triUserExcluded = new Uint8Array(input.triCount)
  const maskedFracMap: MaskedFractionMap = new Map()
  const smoothNrmMap: Vec3Map = new Map()
  const zoneAreaMap: Vec3Map = new Map()
  const excludedPosSet = new Set<string>()

  for (let t = 0; t < input.triCount; t += 1) {
    const b = t * 9
    const ax = input.src[b] ?? 0
    const ay = input.src[b + 1] ?? 0
    const az = input.src[b + 2] ?? 0
    const bx = input.src[b + 3] ?? 0
    const by = input.src[b + 4] ?? 0
    const bz = input.src[b + 5] ?? 0
    const cx = input.src[b + 6] ?? 0
    const cy = input.src[b + 7] ?? 0
    const cz = input.src[b + 8] ?? 0
    const e1x = bx - ax
    const e1y = by - ay
    const e1z = bz - az
    const e2x = cx - ax
    const e2y = cy - ay
    const e2z = cz - az
    const fnx = e1y * e2z - e1z * e2y
    const fny = e1z * e2x - e1x * e2z
    const fnz = e1x * e2y - e1y * e2x
    const flen = Math.sqrt(fnx * fnx + fny * fny + fnz * fnz)
    const nz = flen > 1e-12 ? fnz / flen : 0
    const faceAngle = Math.acos(Math.max(-1, Math.min(1, Math.abs(nz)))) * (180 / Math.PI)
    const angleMasked =
      nz < 0
        ? input.bottomAngleLimit > 0 && faceAngle <= input.bottomAngleLimit
        : input.topAngleLimit > 0 && faceAngle <= input.topAngleLimit

    triUserExcluded[t] = input.userExcludedMask[t] ? 1 : 0
    if (triUserExcluded[t]) {
      excludedPosSet.add(input.posKey(ax, ay, az))
      excludedPosSet.add(input.posKey(bx, by, bz))
      excludedPosSet.add(input.posKey(cx, cy, cz))
    }

    const faceArea = flen * 0.5
    accumulateMaskedFraction(maskedFracMap, input.posKey(ax, ay, az), faceArea, angleMasked)
    accumulateMaskedFraction(maskedFracMap, input.posKey(bx, by, bz), faceArea, angleMasked)
    accumulateMaskedFraction(maskedFracMap, input.posKey(cx, cy, cz), faceArea, angleMasked)

    const [czX, czY, czZ] = resolveCubicZoneAreaContribution(
      input.mappingMode,
      { x: fnx, y: fny, z: fnz },
      flen,
      faceArea,
      input.mappingBlend,
      input.seamBandWidth,
    )
    if (czX > 1e-12 || czY > 1e-12 || czZ > 1e-12) {
      accumulateTuple(zoneAreaMap, input.posKey(ax, ay, az), czX, czY, czZ)
      accumulateTuple(zoneAreaMap, input.posKey(bx, by, bz), czX, czY, czZ)
      accumulateTuple(zoneAreaMap, input.posKey(cx, cy, cz), czX, czY, czZ)
    }

    const addSmooth = (vi: number, x: number, y: number, z: number) => {
      const nx = input.normals ? (input.normals[vi] ?? 0) : (input.triNormals?.[t * 3] ?? 0)
      const ny = input.normals ? (input.normals[vi + 1] ?? 0) : (input.triNormals?.[t * 3 + 1] ?? 0)
      const nzN = input.normals ? (input.normals[vi + 2] ?? 1) : (input.triNormals?.[t * 3 + 2] ?? 1)
      accumulateVec3Weighted(smoothNrmMap, input.posKey(x, y, z), nx, ny, nzN, faceArea)
    }
    addSmooth(b, ax, ay, az)
    addSmooth(b + 3, bx, by, bz)
    addSmooth(b + 6, cx, cy, cz)
  }

  return { triUserExcluded, maskedFracMap, smoothNrmMap, zoneAreaMap, excludedPosSet }
}
