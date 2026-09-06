export function buildUserExcludedTriMask(
  triCount: number,
  excludedFaces: number[],
  exclusionMode: 'exclude' | 'include',
): Uint8Array {
  const set = new Set<number>()
  for (let i = 0; i < excludedFaces.length; i += 1) {
    const idx = Math.floor(Number(excludedFaces[i]))
    if (Number.isFinite(idx) && idx >= 0 && idx < triCount) set.add(idx)
  }
  const out = new Uint8Array(triCount)
  for (let t = 0; t < triCount; t += 1) {
    const inSet = set.has(t)
    out[t] = (exclusionMode === 'include' ? !inSet : inSet) ? 1 : 0
  }
  return out
}

export function ensureUserExcludedTriMaskLength(input: {
  triCount: number
  currentMask: Uint8Array
  excludedFaces: number[]
  exclusionMode: 'exclude' | 'include'
}): Uint8Array {
  if (input.currentMask.length === input.triCount) return input.currentMask
  return buildUserExcludedTriMask(input.triCount, input.excludedFaces, input.exclusionMode)
}
