/**
 * Reveal a prefix of G-code path Line geometries (Kiri CAM animate progress approx).
 * Continuous THREE.Line: vertex count N → N-1 segments; drawRange uses vertex count.
 */

export function clampUnitFraction(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v <= 0) return 0
  if (v >= 1) return 1
  return v
}

export type DrawRangeTarget = {
  setDrawRange: (start: number, count: number) => void
  getVertexCount: () => number
}

export function applyPathProgressDrawRanges(targets: ReadonlyArray<DrawRangeTarget>, fraction: number): void {
  const f = clampUnitFraction(fraction)
  if (!targets.length) return

  let total = 0
  for (const t of targets) total += Math.max(0, t.getVertexCount())
  if (total <= 0) return

  if (f >= 1) {
    for (const t of targets) {
      const n = t.getVertexCount()
      t.setDrawRange(0, n)
    }
    return
  }

  let budget = Math.max(0, Math.floor(f * total))
  for (const t of targets) {
    const n = t.getVertexCount()
    if (n <= 0) {
      t.setDrawRange(0, 0)
      continue
    }
    if (budget <= 0) {
      t.setDrawRange(0, 0)
      continue
    }
    if (budget >= n) {
      t.setDrawRange(0, n)
      budget -= n
    } else {
      // Need ≥2 verts to draw a visible segment
      t.setDrawRange(0, budget < 2 ? 0 : budget)
      budget = 0
    }
  }
}
