/**
 * ASCII DXF → LaserPolyline[] (LINE, LWPOLYLINE, CIRCLE, ARC) + endpoint join.
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

type Pair = { code: number; value: string }

function tokenizeDxf(text: string): Pair[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const pairs: Pair[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(String(lines[i] ?? '').trim())
    const value = String(lines[i + 1] ?? '')
    if (!Number.isFinite(code)) continue
    pairs.push({ code, value })
  }
  return pairs
}

function nearly(a: { x: number; y: number }, b: { x: number; y: number }, eps = 1e-4): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

function sampleCircle(cx: number, cy: number, r: number, n = 48): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

/** DXF angles are degrees CCW from +X. */
function sampleArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
  n = 32,
): Array<{ x: number; y: number }> {
  let a0 = startDeg
  let a1 = endDeg
  while (a1 < a0) a1 += 360
  const span = a1 - a0
  const steps = Math.max(4, Math.ceil((span / 360) * n))
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= steps; i += 1) {
    const a = ((a0 + (span * i) / steps) * Math.PI) / 180
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

/**
 * Join open polylines that share endpoints into longer chains / closed loops.
 */
export function joinDxfOpenSegments(polys: LaserPolyline[], eps = 1e-4): LaserPolyline[] {
  const closed: LaserPolyline[] = []
  const open: LaserPolyline[] = []
  for (const p of polys) {
    if (p.points.length < 2) continue
    if (p.closed) closed.push(p)
    else open.push({ closed: false, points: p.points.map((q) => ({ x: q.x, y: q.y })) })
  }

  const used = new Array(open.length).fill(false)
  const joined: LaserPolyline[] = []

  for (let start = 0; start < open.length; start += 1) {
    if (used[start]) continue
    used[start] = true
    const chain = open[start]!.points.map((q) => ({ x: q.x, y: q.y }))
    let grew = true
    while (grew) {
      grew = false
      const head = chain[0]!
      const tail = chain[chain.length - 1]!
      for (let i = 0; i < open.length; i += 1) {
        if (used[i]) continue
        const pts = open[i]!.points
        const a = pts[0]!
        const b = pts[pts.length - 1]!
        if (nearly(tail, a, eps)) {
          for (let k = 1; k < pts.length; k += 1) chain.push({ ...pts[k]! })
          used[i] = true
          grew = true
          break
        }
        if (nearly(tail, b, eps)) {
          for (let k = pts.length - 2; k >= 0; k -= 1) chain.push({ ...pts[k]! })
          used[i] = true
          grew = true
          break
        }
        if (nearly(head, b, eps)) {
          for (let k = pts.length - 2; k >= 0; k -= 1) chain.unshift({ ...pts[k]! })
          used[i] = true
          grew = true
          break
        }
        if (nearly(head, a, eps)) {
          for (let k = 1; k < pts.length; k += 1) chain.unshift({ ...pts[k]! })
          used[i] = true
          grew = true
          break
        }
      }
    }
    const isClosed = chain.length >= 3 && nearly(chain[0]!, chain[chain.length - 1]!, eps)
    if (isClosed) {
      chain.pop()
      joined.push({ closed: true, points: chain })
    } else {
      joined.push({ closed: false, points: chain })
    }
  }

  return [...closed, ...joined]
}

/**
 * Parse ASCII DXF entities: LINE, LWPOLYLINE, CIRCLE, ARC; then join open segments.
 */
export function parseDxfToLaserPolylines(dxfText: string): LaserPolyline[] {
  const pairs = tokenizeDxf(dxfText)
  const out: LaserPolyline[] = []
  let i = 0
  while (i < pairs.length) {
    const p = pairs[i]!
    if (p.code !== 0) {
      i += 1
      continue
    }
    const ent = p.value.trim().toUpperCase()
    if (ent === 'LINE') {
      let x1 = 0
      let y1 = 0
      let x2 = 0
      let y2 = 0
      i += 1
      while (i < pairs.length && pairs[i]!.code !== 0) {
        const c = pairs[i]!
        if (c.code === 10) x1 = Number(c.value)
        else if (c.code === 20) y1 = Number(c.value)
        else if (c.code === 11) x2 = Number(c.value)
        else if (c.code === 21) y2 = Number(c.value)
        i += 1
      }
      out.push({
        closed: false,
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ],
      })
      continue
    }
    if (ent === 'LWPOLYLINE') {
      const verts: Array<{ x: number; y: number }> = []
      let closed = false
      let pendingX: number | null = null
      i += 1
      while (i < pairs.length && pairs[i]!.code !== 0) {
        const c = pairs[i]!
        if (c.code === 70) {
          const flags = Number(c.value) || 0
          closed = (flags & 1) === 1
        } else if (c.code === 10) {
          pendingX = Number(c.value)
        } else if (c.code === 20 && pendingX != null) {
          verts.push({ x: pendingX, y: Number(c.value) })
          pendingX = null
        }
        i += 1
      }
      if (verts.length >= 2) out.push({ closed, points: verts })
      continue
    }
    if (ent === 'CIRCLE') {
      let cx = 0
      let cy = 0
      let r = 0
      i += 1
      while (i < pairs.length && pairs[i]!.code !== 0) {
        const c = pairs[i]!
        if (c.code === 10) cx = Number(c.value)
        else if (c.code === 20) cy = Number(c.value)
        else if (c.code === 40) r = Number(c.value)
        i += 1
      }
      if (r > 0) out.push({ closed: true, points: sampleCircle(cx, cy, r) })
      continue
    }
    if (ent === 'ARC') {
      let cx = 0
      let cy = 0
      let r = 0
      let a0 = 0
      let a1 = 0
      i += 1
      while (i < pairs.length && pairs[i]!.code !== 0) {
        const c = pairs[i]!
        if (c.code === 10) cx = Number(c.value)
        else if (c.code === 20) cy = Number(c.value)
        else if (c.code === 40) r = Number(c.value)
        else if (c.code === 50) a0 = Number(c.value)
        else if (c.code === 51) a1 = Number(c.value)
        i += 1
      }
      if (r > 0) out.push({ closed: false, points: sampleArc(cx, cy, r, a0, a1) })
      continue
    }
    i += 1
  }
  return joinDxfOpenSegments(out)
}
