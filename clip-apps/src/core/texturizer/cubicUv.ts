export interface CubicUvSettings {
  scaleU: number
  scaleV: number
  offsetU: number
  offsetV: number
  textureAspectU: number
  textureAspectV: number
}

/**
 * Legacy parity: cubic projection UV transform with aspect/scale/offset/rotation and wrap.
 */
export function resolveCubicUv(rawU: number, rawV: number, settings: CubicUvSettings, rotRad: number): { u: number; v: number } {
  const safeScaleU = Math.max(settings.scaleU ?? 1, 1e-8)
  const safeScaleV = Math.max(settings.scaleV ?? 1, 1e-8)
  let u = rawU * (settings.textureAspectU ?? 1) / safeScaleU + (settings.offsetU ?? 0)
  let v = rawV * (settings.textureAspectV ?? 1) / safeScaleV + (settings.offsetV ?? 0)
  if (Math.abs(rotRad) > 1e-12) {
    const c = Math.cos(rotRad)
    const s = Math.sin(rotRad)
    u -= 0.5
    v -= 0.5
    const ru = c * u - s * v
    const rv = s * u + c * v
    u = ru + 0.5
    v = rv + 0.5
  }
  return {
    u: ((u % 1) + 1) % 1,
    v: ((v % 1) + 1) % 1,
  }
}
