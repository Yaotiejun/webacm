export function parseExcludedFacesJson(text: string): number[] {
  const raw = text.trim()
  if (!raw) return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('Excluded Faces JSON must be an array')
  const out: number[] = []
  for (let i = 0; i < parsed.length; i += 1) {
    const n = Number(parsed[i])
    if (!Number.isFinite(n)) continue
    const idx = Math.floor(n)
    if (idx >= 0) out.push(idx)
  }
  return Array.from(new Set(out))
}
