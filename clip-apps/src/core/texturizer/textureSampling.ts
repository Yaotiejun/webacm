export interface GrayTextureInput {
  width: number
  height: number
  gray: Uint8Array
}

/**
 * Bilinear grayscale sampler with UV wrap and V flip.
 */
export function sampleGrayBilinear(texture: GrayTextureInput, u: number, v: number): number {
  const imgW = Math.max(1, Math.floor(texture.width))
  const imgH = Math.max(1, Math.floor(texture.height))
  const imgGray = texture.gray

  const uu = ((u % 1) + 1) % 1
  const vv = 1 - (((v % 1) + 1) % 1)

  const fx = uu * (imgW - 1)
  const fy = vv * (imgH - 1)
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, imgW - 1)
  const y1 = Math.min(y0 + 1, imgH - 1)
  const tx = fx - x0
  const ty = fy - y0

  const v00 = (imgGray[y0 * imgW + x0] ?? 0) / 255
  const v10 = (imgGray[y0 * imgW + x1] ?? 0) / 255
  const v01 = (imgGray[y1 * imgW + x0] ?? 0) / 255
  const v11 = (imgGray[y1 * imgW + x1] ?? 0) / 255

  return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty
}
