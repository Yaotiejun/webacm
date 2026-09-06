import { resolveCubicUv, type CubicUvSettings } from './cubicUv'

export interface CubicZoneSamplePoint {
  x: number
  y: number
  z: number
}

export interface CubicZoneSampleNormal {
  x: number
  y: number
  z: number
}

export interface CubicZoneSampleContext {
  point: CubicZoneSamplePoint
  normal: CubicZoneSampleNormal
  minX: number
  minY: number
  minZ: number
  maxDim: number
  rotRad: number
  uvFrequency: number
  settings: CubicUvSettings
  zoneAreas: [number, number, number]
}

export interface WeightedUvSample {
  u: number
  v: number
  w: number
}

/**
 * Build weighted cubic UV samples from zone-area contributions.
 * Returns null when there is no meaningful zone signal.
 */
export function buildCubicZoneWeightedSamples(ctx: CubicZoneSampleContext): WeightedUvSample[] | null {
  const [zx, zy, zz] = ctx.zoneAreas
  const total = zx + zy + zz
  if (total <= 1e-12) return null
  const out: WeightedUvSample[] = []
  const add = (u: number, v: number, wRaw: number) => {
    if (wRaw <= 1e-12) return
    out.push({ u, v, w: wRaw / total })
  }

  if (zx > 1e-12) {
    let rawU = (ctx.point.y - ctx.minY) / ctx.maxDim
    if (ctx.normal.x < 0) rawU = -rawU
    const uv = resolveCubicUv(rawU, (ctx.point.z - ctx.minZ) / ctx.maxDim, ctx.settings, ctx.rotRad)
    add(uv.u * ctx.uvFrequency, uv.v * ctx.uvFrequency, zx)
  }
  if (zy > 1e-12) {
    let rawU = (ctx.point.x - ctx.minX) / ctx.maxDim
    if (ctx.normal.y > 0) rawU = -rawU
    const uv = resolveCubicUv(rawU, (ctx.point.z - ctx.minZ) / ctx.maxDim, ctx.settings, ctx.rotRad)
    add(uv.u * ctx.uvFrequency, uv.v * ctx.uvFrequency, zy)
  }
  if (zz > 1e-12) {
    let rawU = (ctx.point.x - ctx.minX) / ctx.maxDim
    if (ctx.normal.z < 0) rawU = -rawU
    const uv = resolveCubicUv(rawU, (ctx.point.y - ctx.minY) / ctx.maxDim, ctx.settings, ctx.rotRad)
    add(uv.u * ctx.uvFrequency, uv.v * ctx.uvFrequency, zz)
  }
  return out.length ? out : null
}
