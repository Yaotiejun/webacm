export interface TextureAspectCorrection {
  textureAspectU: number
  textureAspectV: number
}

/**
 * Keep texture-space tiles proportional for non-square grayscale inputs.
 * Legacy parity from stlTexturizer displacement path.
 */
export function resolveTextureAspectCorrection(width: number, height: number): TextureAspectCorrection {
  const w = Number.isFinite(width) ? Math.max(1, width) : 1
  const h = Number.isFinite(height) ? Math.max(1, height) : 1
  const tmax = Math.max(w, h, 1)
  return {
    textureAspectU: tmax / w,
    textureAspectV: tmax / h,
  }
}
