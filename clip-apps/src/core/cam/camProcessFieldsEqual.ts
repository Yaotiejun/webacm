import { stableJsonEqual } from '@/core/stableJson'

/** Same semantics as recent-run snapshot diff: ε for numbers, `stableJsonEqual` for objects/arrays. */
export function camProcessFieldsEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a === 'number' || typeof b === 'number') {
    const av = Number.isFinite(a as number) ? (a as number) : NaN
    const bv = Number.isFinite(b as number) ? (b as number) : NaN
    if (Number.isFinite(av) && Number.isFinite(bv)) return Math.abs(av - bv) < 1e-9
    return a === b
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') return a === b
  if (a === null || b === null) return a === b
  if (typeof a === 'object' || typeof b === 'object') return stableJsonEqual(a, b)
  return a === b
}
