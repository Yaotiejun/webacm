/**
 * Mesh → SLA layer contours via Kiri geo slicer (same contract as sla_slice).
 * Preview only builds contours; device rasterize is deferred to export (like Kiri).
 */
import { pointsFromVertices } from '@/core/slicer/geometry'

export type SlaPoint = { x: number; y: number }
export type SlaLayer = { z: number; fills: SlaPoint[][] }

const EPS = 1e-4

function nearly(a: SlaPoint, b: SlaPoint, eps = EPS): boolean {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

function intersectEdge(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  z: number,
): SlaPoint | null {
  if ((az < z && bz < z) || (az > z && bz > z)) return null
  if (Math.abs(az - bz) < 1e-12) {
    if (Math.abs(az - z) > 1e-9) return null
    return { x: ax, y: ay }
  }
  const t = (z - az) / (bz - az)
  if (t < -1e-9 || t > 1 + 1e-9) return null
  const u = Math.max(0, Math.min(1, t))
  return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u }
}

function trianglePlaneSegments(
  v: Float32Array,
  i0: number,
  z: number,
): Array<[SlaPoint, SlaPoint]> {
  const x0 = v[i0]!
  const y0 = v[i0 + 1]!
  const z0 = v[i0 + 2]!
  const x1 = v[i0 + 3]!
  const y1 = v[i0 + 4]!
  const z1 = v[i0 + 5]!
  const x2 = v[i0 + 6]!
  const y2 = v[i0 + 7]!
  const z2 = v[i0 + 8]!
  const pts: SlaPoint[] = []
  const a = intersectEdge(x0, y0, z0, x1, y1, z1, z)
  const b = intersectEdge(x1, y1, z1, x2, y2, z2, z)
  const c = intersectEdge(x2, y2, z2, x0, y0, z0, z)
  if (a) pts.push(a)
  if (b) pts.push(b)
  if (c) pts.push(c)
  const uniq: SlaPoint[] = []
  for (const p of pts) {
    if (!uniq.some((q) => nearly(p, q))) uniq.push(p)
  }
  if (uniq.length < 2) return []
  if (uniq.length === 2) return [[uniq[0]!, uniq[1]!]]
  return [
    [uniq[0]!, uniq[1]!],
    [uniq[1]!, uniq[2]!],
  ]
}

/** Greedy stitch of open segments into polylines (MVP fallback). */
export function stitchSegmentsToPolylines(
  segs: Array<[SlaPoint, SlaPoint]>,
  eps = EPS,
): SlaPoint[][] {
  type Seg = { a: SlaPoint; b: SlaPoint; used: boolean }
  const pool: Seg[] = segs.map(([a, b]) => ({ a, b, used: false }))
  const out: SlaPoint[][] = []
  for (let start = 0; start < pool.length; start += 1) {
    if (pool[start]!.used) continue
    pool[start]!.used = true
    const chain: SlaPoint[] = [pool[start]!.a, pool[start]!.b]
    let grew = true
    while (grew) {
      grew = false
      const head = chain[0]!
      const tail = chain[chain.length - 1]!
      for (const s of pool) {
        if (s.used) continue
        if (nearly(s.a, tail, eps)) {
          chain.push(s.b)
          s.used = true
          grew = true
          break
        }
        if (nearly(s.b, tail, eps)) {
          chain.push(s.a)
          s.used = true
          grew = true
          break
        }
        if (nearly(s.a, head, eps)) {
          chain.unshift(s.b)
          s.used = true
          grew = true
          break
        }
        if (nearly(s.b, head, eps)) {
          chain.unshift(s.a)
          s.used = true
          grew = true
          break
        }
      }
    }
    if (chain.length >= 2) {
      const head = chain[0]!
      const tail = chain[chain.length - 1]!
      if (chain.length >= 3 && nearly(head, tail, eps * 4)) {
        chain[chain.length - 1] = { x: head.x, y: head.y }
      } else if (chain.length >= 3 && nearly(head, tail, eps * 20)) {
        chain.push({ x: head.x, y: head.y })
      }
      out.push(chain)
    }
  }
  return out
}

function meshZRange(vertices: Float32Array): { zMin: number; zMax: number } {
  let zMin = Infinity
  let zMax = -Infinity
  for (let i = 2; i < vertices.length; i += 3) {
    const z = vertices[i]!
    if (z < zMin) zMin = z
    if (z > zMax) zMax = z
  }
  if (!Number.isFinite(zMin)) return { zMin: 0, zMax: 0 }
  return { zMin, zMax }
}

function polyPointsToFill(poly: unknown): SlaPoint[] | null {
  const pts = (poly as { points?: unknown })?.points
  if (!Array.isArray(pts) || pts.length < 3) return null
  const out: SlaPoint[] = []
  for (const p of pts) {
    const x =
      typeof (p as { x?: number })?.x === 'number'
        ? (p as { x: number }).x
        : Array.isArray(p)
          ? Number(p[0])
          : NaN
    const y =
      typeof (p as { y?: number })?.y === 'number'
        ? (p as { y: number }).y
        : Array.isArray(p)
          ? Number(p[1])
          : NaN
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    out.push({ x, y })
  }
  if (out.length < 3) return null
  return out
}

function groupsToFills(groups: unknown): SlaPoint[][] {
  if (!Array.isArray(groups)) return []
  const fills: SlaPoint[][] = []
  const walk = (g: unknown) => {
    const outer = polyPointsToFill(g)
    if (outer) fills.push(outer)
    const nestedPoly = (g as { poly?: unknown })?.poly
    if (!outer && nestedPoly) {
      const fromPoly = polyPointsToFill(nestedPoly)
      if (fromPoly) fills.push(fromPoly)
    }
    const inner = (g as { inner?: unknown })?.inner
    if (Array.isArray(inner)) {
      for (const inn of inner) walk(inn)
    }
  }
  for (const g of groups) walk(g)
  return fills
}

function topsToFills(tops: unknown): SlaPoint[][] {
  if (!Array.isArray(tops)) return []
  const fills: SlaPoint[][] = []
  for (const top of tops) {
    const poly = (top as { poly?: unknown })?.poly ?? top
    const fill = polyPointsToFill(poly)
    if (fill) fills.push(fill)
  }
  return fills
}

/** Sync MVP plane cut (fallback). */
export function sliceMeshToLayersMvp(vertices: Float32Array, layerHeightMm: number): SlaLayer[] {
  const lh = Math.max(1e-4, Number(layerHeightMm) || 0.05)
  const { zMin, zMax } = meshZRange(vertices)
  if (zMax <= zMin) return []

  const layers: SlaLayer[] = []
  const startZ = zMin + lh * 0.5
  for (let z = startZ; z < zMax - 1e-9; z += lh) {
    const segs: Array<[SlaPoint, SlaPoint]> = []
    for (let i = 0; i + 8 < vertices.length; i += 9) {
      segs.push(...trianglePlaneSegments(vertices, i, z))
    }
    layers.push({ z, fills: stitchSegmentsToPolylines(segs) })
  }
  return layers
}

function nestedPolysToFills(polys: unknown): SlaPoint[][] {
  if (!Array.isArray(polys)) return []
  const fills: SlaPoint[][] = []
  const walk = (g: unknown) => {
    const outer = polyPointsToFill(g)
    if (outer) fills.push(outer)
    const nestedPoly = (g as { poly?: unknown })?.poly
    if (!outer && nestedPoly) {
      const fromPoly = polyPointsToFill(nestedPoly)
      if (fromPoly) fills.push(fromPoly)
    }
    const inner = (g as { inner?: unknown })?.inner
    if (Array.isArray(inner)) {
      for (const inn of inner) walk(inn)
    }
  }
  for (const g of polys) walk(g)
  return fills
}

/**
 * Kiri sla_slice geo phase:
 *   slicer.slice(points, { zMin: bounds.min.z + height/2, zMax, zInc: height, union: healMesh })
 *   → POLY.nest(groups) → tops
 *
 * No timeout→MVP trap (that made real STLs slow/wrong). MVP only if geo returns empty.
 */
export async function sliceMeshToLayers(
  vertices: Float32Array,
  layerHeightMm: number,
  opts?: { healMesh?: boolean; onProgress?: (p: number) => void },
): Promise<SlaLayer[]> {
  const lh = Math.max(1e-4, Number(layerHeightMm) || 0.05)
  const { zMin, zMax } = meshZRange(vertices)
  if (zMax <= zMin) return []

  try {
    const { geoSlice, newPoint, POLY } = await import('@/core/slicer/kiriLegacyGeo')
    const pts = pointsFromVertices(vertices, newPoint)
    if (!pts.length) return sliceMeshToLayersMvp(vertices, lh)

    // Match Kiri sla_slice options exactly (slice.js ~222-236)
    const zMinSlice = zMin + lh * 0.5
    const out = await geoSlice(pts, {
      zMin: zMinSlice,
      zMax,
      zInc: lh,
      union: opts?.healMesh !== false,
      flat: false,
      onupdate: (v: number) => {
        opts?.onProgress?.(Math.max(0, Math.min(1, Number(v) || 0)))
      },
    })

    const layers: SlaLayer[] = []
    for (const s of out?.slices || []) {
      const z = typeof s?.z === 'number' ? s.z : NaN
      if (!Number.isFinite(z)) continue
      // Kiri: tops = POLY.nest(groups)
      const nested =
        typeof POLY?.nest === 'function' && Array.isArray(s.groups) ? POLY.nest(s.groups) : s.groups
      let fills = nestedPolysToFills(nested)
      if (!fills.length) fills = topsToFills(s.tops)
      if (!fills.length) fills = nestedPolysToFills(s.unioned)
      if (!fills.length) fills = groupsToFills(s.groups)
      layers.push({ z, fills })
    }
    layers.sort((a, b) => a.z - b.z)
    if (layers.length) return layers
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[slaLayers] Kiri geoSlice failed; using MVP fallback', e)
  }
  return sliceMeshToLayersMvp(vertices, lh)
}

function pointInPoly(x: number, y: number, poly: SlaPoint[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x
    const yi = poly[i]!.y
    const xj = poly[j]!.x
    const yj = poly[j]!.y
    const denom = yj - yi || 1e-12
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / denom + xi
    if (intersect) inside = !inside
  }
  return inside
}

function inAnyFill(x: number, y: number, fills: SlaPoint[][]): boolean {
  let on = false
  for (const poly of fills) {
    if (poly.length >= 3 && pointInPoly(x, y, poly)) on = !on
  }
  return on
}

function circlePoly(cx: number, cy: number, r: number, n = 12): SlaPoint[] {
  const pts: SlaPoint[] = []
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

export type SlaPillarSupportOpts = {
  enable?: boolean
  /** Sample spacing in mm. Default 3. */
  spacingMm?: number
  /** Pillar radius mm. Default 0.6. */
  radiusMm?: number
}

/**
 * Simple vertical pillars under overhang samples (layer N not covered by N-1).
 */
export function addPillarSupports(layers: SlaLayer[], opts: SlaPillarSupportOpts = {}): SlaLayer[] {
  if (!opts.enable || layers.length < 2) return layers
  const spacing = Math.max(1.5, Number(opts.spacingMm) || 3)
  const radius = Math.max(0.2, Number(opts.radiusMm) || 0.6)
  const MAX_PILLARS = 180
  const MAX_SAMPLES_PER_LAYER = 320

  const out = layers.map((L) => ({
    z: L.z,
    fills: L.fills.map((f) => f.map((p) => ({ x: p.x, y: p.y }))),
  }))

  const pillars: Array<{ x: number; y: number; topIndex: number }> = []
  for (let i = 1; i < out.length; i += 1) {
    if (pillars.length >= MAX_PILLARS) break
    const cur = out[i]!
    const below = out[i - 1]!
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const f of cur.fills) {
      for (const p of f) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
    }
    if (!Number.isFinite(minX)) continue
    let samples = 0
    for (let x = minX; x <= maxX; x += spacing) {
      for (let y = minY; y <= maxY; y += spacing) {
        if (samples >= MAX_SAMPLES_PER_LAYER || pillars.length >= MAX_PILLARS) break
        samples += 1
        if (inAnyFill(x, y, cur.fills) && !inAnyFill(x, y, below.fills)) {
          pillars.push({ x, y, topIndex: i })
        }
      }
      if (samples >= MAX_SAMPLES_PER_LAYER || pillars.length >= MAX_PILLARS) break
    }
  }

  for (const p of pillars) {
    const disk = circlePoly(p.x, p.y, radius)
    for (let i = 0; i <= p.topIndex; i += 1) {
      out[i]!.fills.push(disk.map((q) => ({ x: q.x, y: q.y })))
    }
  }
  return out
}

/** Rasterize closed fills into width*height Uint8Array of 0/1 bytes. */
export function rasterizeLayer(
  fills: SlaPoint[][],
  width: number,
  height: number,
  bedW: number,
  bedD: number,
): Uint8Array {
  const w = Math.max(1, Math.floor(width))
  const h = Math.max(1, Math.floor(height))
  const bw = Math.max(1e-6, bedW)
  const bd = Math.max(1e-6, bedD)
  const out = new Uint8Array(w * h)
  for (let py = 0; py < h; py += 1) {
    const y = ((py + 0.5) / h - 0.5) * bd
    for (let px = 0; px < w; px += 1) {
      const x = ((px + 0.5) / w - 0.5) * bw
      let on = false
      for (const poly of fills) {
        if (poly.length >= 3 && pointInPoly(x, y, poly)) on = !on
      }
      if (on) out[py * w + px] = 1
    }
  }
  for (const poly of fills) {
    for (let i = 0; i < poly.length; i += 1) {
      const a = poly[i]!
      const b = poly[(i + 1) % poly.length]!
      const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * Math.max(w / bw, h / bd) * 2))
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        const px = Math.floor((x / bw + 0.5) * w)
        const py = Math.floor((y / bd + 0.5) * h)
        if (px >= 0 && py >= 0 && px < w && py < h) out[py * w + px] = 1
      }
    }
  }
  return out
}
