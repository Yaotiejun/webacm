/**
 * Safer alternative to grip `net-level` `util.evil` (no `eval`).
 * Parses JSON objects/arrays; returns primitives as strings.
 */
export function gripNetLevelSafeParse(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  const num = Number(trimmed)
  if (Number.isFinite(num) && String(num) === trimmed) return num
  return value
}
