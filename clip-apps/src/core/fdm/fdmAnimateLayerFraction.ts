/**
 * Kiri STACKS.setFraction parity helpers for FDM layer animate/preview.
 * Fraction 0..1 reveals a prefix of the top layer's polylines (by segment count).
 */

export function clampUnitFraction(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v <= 0) return 0
  if (v >= 1) return 1
  return v
}

/**
 * Trim polyline points so roughly `fraction` of segments remain.
 * Returns [] when fraction is 0; full copy when fraction is 1.
 */
export function trimPolylineByFraction(
  points: ReadonlyArray<ReadonlyArray<number>>,
  fraction: number,
): Array<[number, number]> {
  const f = clampUnitFraction(fraction)
  const n = points.length
  if (n < 2 || f <= 0) return []
  if (f >= 1) {
    return points.map((p) => [Number(p[0]) || 0, Number(p[1]) || 0] as [number, number])
  }
  const segs = n - 1
  const keepSegs = Math.max(1, Math.ceil(f * segs))
  const end = Math.min(n, keepSegs + 1)
  const out: Array<[number, number]> = []
  for (let i = 0; i < end; i++) {
    const p = points[i]!
    out.push([Number(p[0]) || 0, Number(p[1]) || 0])
  }
  return out
}

/**
 * Across a layer's paths (excluding travel), reveal paths in order by cumulative
 * segment budget so fraction advances smoothly across the whole layer.
 */
export function trimLayerPathsByFraction<T extends { type: string; points: ReadonlyArray<ReadonlyArray<number>> }>(
  paths: ReadonlyArray<T>,
  fraction: number,
): Array<{ type: string; points: Array<[number, number]> }> {
  const f = clampUnitFraction(fraction)
  const printable = paths.filter((p) => p.type !== 'travel' && p.points.length >= 2)
  if (!printable.length || f <= 0) return []

  let totalSegs = 0
  for (const p of printable) totalSegs += p.points.length - 1
  if (totalSegs <= 0) return []

  if (f >= 1) {
    return printable.map((p) => ({
      type: p.type,
      points: p.points.map((pt) => [Number(pt[0]) || 0, Number(pt[1]) || 0] as [number, number]),
    }))
  }

  let budget = Math.max(1, Math.ceil(f * totalSegs))
  const out: Array<{ type: string; points: Array<[number, number]> }> = []
  for (const p of printable) {
    if (budget <= 0) break
    const segs = p.points.length - 1
    if (segs <= budget) {
      out.push({
        type: p.type,
        points: p.points.map((pt) => [Number(pt[0]) || 0, Number(pt[1]) || 0] as [number, number]),
      })
      budget -= segs
    } else {
      const localFrac = budget / segs
      const trimmed = trimPolylineByFraction(p.points, localFrac)
      if (trimmed.length >= 2) out.push({ type: p.type, points: trimmed })
      budget = 0
    }
  }
  return out
}
