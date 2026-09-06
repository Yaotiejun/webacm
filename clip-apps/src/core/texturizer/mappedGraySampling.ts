export interface WeightedUvPoint {
  u?: number
  v?: number
  w?: number
}

export interface MappedUvPayload {
  u?: number
  v?: number
  triplanar?: boolean
  samples?: WeightedUvPoint[]
}

/**
 * Resolve mapped grayscale from UV payload.
 * Keeps legacy behavior for triplanar weighted sampling fallback.
 */
export function sampleMappedGray(
  uv: MappedUvPayload | null | undefined,
  uvFrequency: number,
  sampleGray: (u: number, v: number) => number,
): number {
  if (uv?.triplanar && Array.isArray(uv.samples) && uv.samples.length > 0) {
    let acc = 0
    let wsum = 0
    for (let i = 0; i < uv.samples.length; i += 1) {
      const s = uv.samples[i]
      const su = (s?.u ?? 0) * uvFrequency
      const sv = (s?.v ?? 0) * uvFrequency
      const w = Math.max(0, s?.w ?? 0)
      acc += sampleGray(su, sv) * w
      wsum += w
    }
    if (wsum > 1e-8) return acc / wsum
    return sampleGray((uv.samples[0]?.u ?? 0) * uvFrequency, (uv.samples[0]?.v ?? 0) * uvFrequency)
  }
  return sampleGray((uv?.u ?? 0) * uvFrequency, (uv?.v ?? 0) * uvFrequency)
}
