import type { RasterTracingPath } from '@/types/raster'

const EPS = 1e-9

function samePoint(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) <= EPS && Math.abs(a[1] - b[1]) <= EPS
}

export function sanitizeTracingPathPoints(points: Array<[number, number]>): Array<[number, number]> {
  if (!points.length) return []
  const out: Array<[number, number]> = [points[0]!]
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i]!
    const prev = out[out.length - 1]!
    if (!samePoint(prev, p)) out.push(p)
  }
  return out
}

function pointSegmentDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const vx = b[0] - a[0]
  const vy = b[1] - a[1]
  const wx = p[0] - a[0]
  const wy = p[1] - a[1]
  const vv = vx * vx + vy * vy
  if (vv <= EPS) return Math.hypot(wx, wy)
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv))
  const px = a[0] + t * vx
  const py = a[1] + t * vy
  return Math.hypot(p[0] - px, p[1] - py)
}

export function simplifyTracingPolylineRdp(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length <= 2) return [...points]
  const eps = Math.max(1e-6, epsilon)

  const recurse = (pts: Array<[number, number]>): Array<[number, number]> => {
    if (pts.length <= 2) return [...pts]
    const first = pts[0]!
    const last = pts[pts.length - 1]!
    let maxDist = -1
    let maxIdx = -1
    for (let i = 1; i < pts.length - 1; i += 1) {
      const d = pointSegmentDistance(pts[i]!, first, last)
      if (d > maxDist) {
        maxDist = d
        maxIdx = i
      }
    }
    if (maxDist <= eps || maxIdx <= 0) return [first, last]
    const left = recurse(pts.slice(0, maxIdx + 1))
    const right = recurse(pts.slice(maxIdx))
    return [...left.slice(0, -1), ...right]
  }

  return recurse(points)
}

export function sampleTracingPolyline(points: Array<[number, number]>, step: number): Array<[number, number]> {
  const clean = sanitizeTracingPathPoints(points)
  if (clean.length <= 1) return [...clean]
  const out: Array<[number, number]> = [clean[0]!]
  const safeStep = Math.max(1e-6, step)

  const cornerSeverityAt = (idx: number): number => {
    if (idx <= 0 || idx >= clean.length - 1) return 0
    const prev = clean[idx - 1]!
    const curr = clean[idx]!
    const next = clean[idx + 1]!
    const v1x = curr[0] - prev[0]
    const v1y = curr[1] - prev[1]
    const v2x = next[0] - curr[0]
    const v2y = next[1] - curr[1]
    const n1 = Math.hypot(v1x, v1y)
    const n2 = Math.hypot(v2x, v2y)
    if (n1 <= EPS || n2 <= EPS) return 0
    const dot = (v1x * v2x + v1y * v2y) / (n1 * n2)
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)))
    return angle / Math.PI
  }

  const segmentAdaptiveStep = (segIdx: number): number => {
    const severity = Math.max(cornerSeverityAt(segIdx), cornerSeverityAt(segIdx + 1))
    // Straight chains get sparser sampling; sharp corners get denser sampling.
    const multiplier = 1.35 - 0.85 * severity
    return Math.max(safeStep * 0.5, safeStep * multiplier)
  }

  for (let i = 0; i < clean.length - 1; i += 1) {
    const a = clean[i]!
    const b = clean[i + 1]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const d = Math.hypot(dx, dy)
    if (d <= EPS) continue
    const localStep = segmentAdaptiveStep(i)
    if (d <= localStep) {
      out.push(b)
      continue
    }
    const segs = Math.ceil(d / localStep)
    for (let s = 1; s <= segs; s += 1) {
      const t = s / segs
      out.push([a[0] + dx * t, a[1] + dy * t])
    }
  }
  return out
}

export function countTracingPoints(paths: Array<Array<[number, number]>>): number {
  let total = 0
  for (let i = 0; i < paths.length; i += 1) {
    total += paths[i]?.length ?? 0
  }
  return total
}

export function trimSampledPolylineByStride(points: Array<[number, number]>, stride: number): Array<[number, number]> {
  if (points.length <= 2) return [...points]
  const s = Math.max(1, Math.floor(stride))
  if (s <= 1) return [...points]
  const out: Array<[number, number]> = [points[0]!]
  for (let i = s; i < points.length - 1; i += s) {
    out.push(points[i]!)
  }
  const last = points[points.length - 1]!
  const tail = out[out.length - 1]
  if (!tail || !samePoint(tail, last)) out.push(last)
  return out
}

export function enforceTracingPointBudget(
  sampledPaths: Array<Array<[number, number]>>,
  maxPoints: number
): Array<Array<[number, number]>> {
  const budget = Math.max(1, Math.floor(maxPoints))
  const total = countTracingPoints(sampledPaths)
  if (total <= budget) return sampledPaths.map((p) => [...p])
  const stride = Math.ceil(total / budget)
  return sampledPaths
    .map((p) => trimSampledPolylineByStride(p, stride))
    .filter((p) => p.length >= 2)
}

function resolveRdpEpsilonFromStep(step: number): number {
  const safeStep = Math.max(1e-6, step)
  // Keep simplification bounded: strong enough on coarse steps, conservative on fine steps.
  return Math.max(1e-4, Math.min(0.5, safeStep * 0.2))
}

export function normalizeTracingPaths(paths: RasterTracingPath[], baseStep = 1): RasterTracingPath[] {
  const out: RasterTracingPath[] = []
  const epsilon = resolveRdpEpsilonFromStep(baseStep)
  for (let i = 0; i < paths.length; i += 1) {
    const p = paths[i]
    if (!p?.points?.length) continue
    const clean = sanitizeTracingPathPoints(p.points)
    if (clean.length < 2) continue
    const simplified = simplifyTracingPolylineRdp(clean, epsilon)
    if (simplified.length < 2) continue
    out.push({ points: simplified })
  }
  return out
}
