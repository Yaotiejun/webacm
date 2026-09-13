/**
 * TypeScript port of Kiri LASER prepare path logic (2D):
 * kerf → nest → origin → travel order (Kiri prepare).
 * Engrave scanlines use row/zigzag order (not O(n^2) nearest).
 */
import { packLaserPolylinesLayout } from '@/core/laser/laserNest'
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserPt = { x: number; y: number }

export type LaserPreparedPoly = {
  closed: boolean
  points: LaserPt[]
}

export type LaserPrepareOpts = {
  kerf?: number
  /** Kiri ctOutTileSpacing — gap between packed tiles. */
  nestGap?: number
  bedWidth?: number
  bedDepth?: number
  origin?: 'preserve' | 'center' | 'bounds' | 'bed'
  engraveScan?: boolean
  /** Kiri ctOutGroup — inners before outers. Default true. */
  grouped?: boolean
  /**
   * Run Layout pack (Kiri Packer). Default true for vector cuts.
   * When false, keep imported XY (platform arrange only).
   */
  layoutPack?: boolean
}

function dist2(a: LaserPt, b: LaserPt): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** Closed poly: Clipper-like constant offset with miter (Kiri ctSliceKerf). Open paths unchanged. */
export function applyKerfLikeKiri(poly: LaserPolyline, kerfMm: number): LaserPolyline {
  if (!poly.closed || !kerfMm || Math.abs(kerfMm) < 1e-9 || poly.points.length < 3) {
    return { closed: poly.closed, points: poly.points.map((p) => ({ x: p.x, y: p.y })) }
  }
  const pts = poly.points
  const n = pts.length
  // Signed area: positive = CCW (expand with +kerf like Kiri remaining-material offset)
  let area2 = 0
  for (let i = 0; i < n; i += 1) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    area2 += a.x * b.y - b.x * a.y
  }
  const sign = area2 >= 0 ? 1 : -1
  const out: LaserPt[] = []
  for (let i = 0; i < n; i += 1) {
    const prev = pts[(i - 1 + n) % n]!
    const cur = pts[i]!
    const next = pts[(i + 1) % n]!
    const ax = cur.x - prev.x
    const ay = cur.y - prev.y
    const bx = next.x - cur.x
    const by = next.y - cur.y
    const al = Math.hypot(ax, ay) || 1
    const bl = Math.hypot(bx, by) || 1
    const ux = ax / al
    const uy = ay / al
    const vx = bx / bl
    const vy = by / bl
    // outward normal of incoming edge (left of CCW)
    const nx0 = -uy * sign
    const ny0 = ux * sign
    const nx1 = -vy * sign
    const ny1 = vx * sign
    let mx = nx0 + nx1
    let my = ny0 + ny1
    const ml = Math.hypot(mx, my)
    if (ml < 1e-9) {
      mx = nx0
      my = ny0
    } else {
      mx /= ml
      my /= ml
    }
    // miter length ≈ kerf / sin(half-angle); clamp like Clipper miter
    const cross = ux * vy - uy * vx
    const dot = ux * vx + uy * vy
    const half = Math.atan2(cross, dot) / 2
    const sinH = Math.sin(Math.abs(half))
    const miter = Math.min(8, 1 / Math.max(0.15, sinH))
    const d = kerfMm * miter
    out.push({ x: cur.x + mx * d, y: cur.y + my * d })
  }
  return { closed: true, points: out }
}

/** Force clockwise winding (Kiri polyPrintPath). */
function forceClockwise(poly: LaserPreparedPoly): LaserPreparedPoly {
  if (!poly.closed || poly.points.length < 3) return poly
  let area2 = 0
  const pts = poly.points
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    area2 += a.x * b.y - b.x * a.y
  }
  if (area2 > 0) {
    return { closed: true, points: [...pts].reverse() }
  }
  return poly
}

function rotateClosedToIndex(poly: LaserPreparedPoly, index: number): LaserPreparedPoly {
  if (!poly.closed || index <= 0) return poly
  const pts = poly.points
  return { closed: true, points: [...pts.slice(index), ...pts.slice(0, index)] }
}

function closestVertexIndex(poly: LaserPreparedPoly, from: LaserPt): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < poly.points.length; i += 1) {
    const d = dist2(poly.points[i]!, from)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

function orientForStart(poly: LaserPreparedPoly, from: LaserPt): LaserPreparedPoly {
  if (poly.points.length < 2) return poly
  if (poly.closed) return rotateClosedToIndex(poly, closestVertexIndex(poly, from))
  const first = poly.points[0]!
  const last = poly.points[poly.points.length - 1]!
  if (dist2(last, from) + 1e-12 < dist2(first, from)) {
    return { closed: false, points: [...poly.points].reverse() }
  }
  return poly
}

function bbox(polys: LaserPreparedPoly[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of polys) {
    for (const p of poly.points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

function applyOrigin(
  polys: LaserPreparedPoly[],
  origin: LaserPrepareOpts['origin'],
  bedWidth: number,
  bedDepth: number,
): LaserPreparedPoly[] {
  const mode = origin || 'center'
  if (mode === 'preserve') {
    return polys.map((p) => ({
      closed: p.closed,
      points: p.points.map((q) => ({ x: q.x, y: q.y })),
    }))
  }
  const b = bbox(polys)
  const w = b.maxX - b.minX
  const h = b.maxY - b.minY
  let dx = 0
  let dy = 0
  if (mode === 'center') {
    dx = -(b.minX + w / 2)
    dy = -(b.minY + h / 2)
  } else if (mode === 'bounds') {
    dx = -b.minX
    dy = -b.minY
  } else {
    dx = bedWidth / 2
    dy = bedDepth / 2
  }
  return polys.map((p) => ({
    closed: p.closed,
    points: p.points.map((q) => ({ x: q.x + dx, y: q.y + dy })),
  }))
}

export function orderLaserPolylinesNearest(
  polys: LaserPreparedPoly[],
  start: LaserPt = { x: 0, y: 0 },
): LaserPreparedPoly[] {
  const remain = polys.map((p) => ({
    closed: p.closed,
    points: p.points.map((q) => ({ x: q.x, y: q.y })),
  }))
  const ordered: LaserPreparedPoly[] = []
  let cur = { ...start }
  while (remain.length) {
    let bestI = 0
    let bestD = Infinity
    let bestOriented: LaserPreparedPoly = remain[0]!
    for (let i = 0; i < remain.length; i += 1) {
      const oriented = orientForStart(remain[i]!, cur)
      const entry = oriented.points[0]!
      const d = dist2(entry, cur)
      if (d < bestD) {
        bestD = d
        bestI = i
        bestOriented = oriented
      }
    }
    ordered.push(bestOriented)
    remain.splice(bestI, 1)
    const last = bestOriented.points[bestOriented.points.length - 1]!
    cur = { x: last.x, y: last.y }
  }
  return ordered
}

/**
 * Bitmap scanline order: top→bottom rows, zigzag L→R / R→L (Kiri-like raster travel).
 */
export function orderLaserEngraveScanlines(polys: LaserPreparedPoly[]): LaserPreparedPoly[] {
  const scored = polys.map((p, i) => {
    const y = (p.points[0]!.y + p.points[p.points.length - 1]!.y) / 2
    const x0 = Math.min(p.points[0]!.x, p.points[p.points.length - 1]!.x)
    return { i, y, x0, p }
  })
  scored.sort((a, b) => b.y - a.y || a.x0 - b.x0)

  const out: LaserPreparedPoly[] = []
  let rowKey = Number.NaN
  let rowIdx = -1
  let rowBuf: LaserPreparedPoly[] = []

  const flush = () => {
    if (!rowBuf.length) return
    if (rowIdx % 2 === 1) {
      for (const poly of rowBuf.reverse()) {
        out.push({ closed: false, points: [...poly.points].reverse() })
      }
    } else {
      out.push(...rowBuf)
    }
    rowBuf = []
  }

  for (const rec of scored) {
    const key = Math.round(rec.y * 1000) / 1000
    if (key !== rowKey) {
      flush()
      rowKey = key
      rowIdx += 1
    }
    rowBuf.push({
      closed: false,
      points: rec.p.points.map((q) => ({ x: q.x, y: q.y })),
    })
  }
  flush()
  return out
}

export function prepareLaserPolylines(
  input: LaserPolyline[],
  opts: LaserPrepareOpts = {},
): LaserPreparedPoly[] {
  if (!input.length) throw new Error('No cuttable paths found')
  const engrave = Boolean(opts.engraveScan)
  const kerf = engrave ? 0 : Number(opts.kerf) || 0
  const nestGap = engrave ? 0 : Math.max(0, Number(opts.nestGap) || 0)
  const bedW = Number(opts.bedWidth) || 300
  const bedD = Number(opts.bedDepth) || 300
  const origin = engrave ? opts.origin ?? 'preserve' : opts.origin ?? 'center'
  const grouped = opts.grouped !== false
  const layoutPack = engrave ? false : opts.layoutPack !== false

  let polys = input
    .filter((p) => p.points.length >= 2)
    .map((p) => applyKerfLikeKiri(p, kerf))

  if (!polys.length) throw new Error('No cuttable paths found')

  // Kiri Layout: nest holes + pack tiles with ctOutTileSpacing
  if (layoutPack) {
    polys = packLaserPolylinesLayout(polys, nestGap, bedW, { grouped, pack: true })
  }

  let prepared: LaserPreparedPoly[] = polys.map((p) => ({
    closed: Boolean(p.closed),
    points: p.points.map((q) => ({ x: q.x, y: q.y })),
  }))

  // Kiri: origin sets currentPos first, then nearest-tile search from there
  prepared = applyOrigin(prepared, origin, bedW, bedD)
  prepared = prepared.map(forceClockwise)

  if (engrave) {
    prepared = orderLaserEngraveScanlines(prepared)
  } else if (prepared.length > 2500) {
    prepared = orderLaserEngraveScanlines(prepared)
  } else {
    prepared = orderLaserPolylinesNearest(prepared, { x: 0, y: 0 })
  }
  return prepared
}

export function preparedToPolylines(prepared: LaserPreparedPoly[]): LaserPolyline[] {
  return prepared.map((p) => ({
    closed: p.closed,
    points: p.points.map((q) => ({ x: q.x, y: q.y })),
  }))
}