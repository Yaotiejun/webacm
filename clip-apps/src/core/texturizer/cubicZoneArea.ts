// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error legacy JS module without types
import { getCubicBlendWeights, MODE_CUBIC } from './legacy/mapping.js'

export type CubicZoneArea = [number, number, number]

export function resolveCubicZoneAreaContribution(
  mappingMode: number,
  faceNormal: { x: number; y: number; z: number },
  faceNormalLength: number,
  faceArea: number,
  mappingBlend: number,
  seamBandWidth: number,
): CubicZoneArea {
  if (mappingMode !== MODE_CUBIC || faceNormalLength <= 1e-12 || faceArea <= 0) return [0, 0, 0]
  const unit = { x: faceNormal.x / faceNormalLength, y: faceNormal.y / faceNormalLength, z: faceNormal.z / faceNormalLength }
  const w = getCubicBlendWeights(unit, mappingBlend, seamBandWidth)
  return [w.x * faceArea, w.y * faceArea, w.z * faceArea]
}
