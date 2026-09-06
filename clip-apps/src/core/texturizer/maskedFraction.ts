export type MaskedFractionMap = Map<string, [number, number]>

export function accumulateMaskedFraction(
  map: MaskedFractionMap,
  key: string,
  faceArea: number,
  angleMasked: boolean,
) {
  const acc = map.get(key)
  if (acc) {
    acc[0] += angleMasked ? faceArea : 0
    acc[1] += faceArea
  } else {
    map.set(key, [angleMasked ? faceArea : 0, faceArea])
  }
}

export function resolveMaskedFraction(map: MaskedFractionMap, key: string): number {
  const pair = map.get(key)
  if (!pair) return 0
  const total = pair[1]
  if (!Number.isFinite(total) || total <= 1e-8) return 0
  const masked = Number.isFinite(pair[0]) ? pair[0] : 0
  const ratio = masked / total
  return ratio < 0 ? 0 : ratio > 1 ? 1 : ratio
}
