import type { WeightedUvSample } from './cubicZoneSampling'

export function resolveCachedGray(cache: Map<string, number>, key: string, compute: () => number): number {
  const cached = cache.get(key)
  if (cached != null) return cached
  const next = compute()
  cache.set(key, next)
  return next
}

export function accumulateWeightedGray(samples: WeightedUvSample[], sampleGray: (u: number, v: number) => number): number {
  let acc = 0
  for (let i = 0; i < samples.length; i += 1) {
    const s = samples[i]
    if (!s) continue
    const w = Number.isFinite(s.w) ? Math.max(0, s.w) : 0
    if (w <= 0) continue
    acc += sampleGray(s.u, s.v) * w
  }
  return acc
}
