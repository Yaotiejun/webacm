/**
 * Kiri-like laser Layout: nest holes, pack tiles with spacing (ctOutTileSpacing),
 * cut order respects grouped (ctOutGroup: inners before outers).
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserNestTile = {
  outer: LaserPolyline
  inners: LaserPolyline[]
}

function polyBBox(poly: LaserPolyline): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of poly.points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

function translatePoly(poly: LaserPolyline, dx: number, dy: number): LaserPolyline {
  return {
    closed: poly.closed,
    points: poly.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  }
}

function polyAreaAbs(poly: LaserPolyline): number {
  const pts = poly.points
  if (pts.length < 3) return 0
  let a = 0
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i]!
    const q = pts[(i + 1) % pts.length]!
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) * 0.5
}

/** Ray-cast point-in-polygon (closed). */
export function pointInLaserPoly(
  pt: { x: number; y: number },
  poly: LaserPolyline,
): boolean {
  const pts = poly.points
  if (pts.length < 3) return false
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const pi = pts[i]!
    const pj = pts[j]!
    const intersect =
      pi.y > pt.y !== pj.y > pt.y &&
      pt.x < ((pj.x - pi.x) * (pt.y - pi.y)) / (pj.y - pi.y + 1e-15) + pi.x
    if (intersect) inside = !inside
  }
  return inside
}

function polyCentroid(poly: LaserPolyline): { x: number; y: number } {
  let x = 0
  let y = 0
  const n = poly.points.length || 1
  for (const p of poly.points) {
    x += p.x
    y += p.y
  }
  return { x: x / n, y: y / n }
}

type NestNode = { poly: LaserPolyline; children: NestNode[]; area: number }

/**
 * Build containment nest of closed polylines (Kiri POLY.nest-like).
 * Open paths returned separately.
 */
export function nestLaserClosedPolylines(polys: LaserPolyline[]): {
  roots: NestNode[]
  open: LaserPolyline[]
} {
  const closed: NestNode[] = []
  const open: LaserPolyline[] = []
  for (const p of polys) {
    if (p.closed && p.points.length >= 3) {
      closed.push({ poly: p, children: [], area: polyAreaAbs(p) })
    } else if (p.points.length >= 2) {
      open.push({ closed: p.closed, points: p.points.map((q) => ({ x: q.x, y: q.y })) })
    }
  }
  closed.sort((a, b) => b.area - a.area)

  const roots: NestNode[] = []
  for (const node of closed) {
    const c = polyCentroid(node.poly)
    let parent: NestNode | null = null
    // smallest enclosing parent among already-placed (scan roots recursively)
    const findParent = (candidates: NestNode[]): NestNode | null => {
      let best: NestNode | null = null
      for (const cand of candidates) {
        if (cand === node) continue
        if (cand.area <= node.area + 1e-9) continue
        if (!pointInLaserPoly(c, cand.poly)) continue
        const deeper = findParent(cand.children)
        best = deeper || cand
      }
      return best
    }
    parent = findParent(roots)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return { roots, open }
}

function tileBBox(tile: LaserNestTile) {
  const all = [tile.outer, ...tile.inners]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of all) {
    const b = polyBBox(poly)
    if (b.minX < minX) minX = b.minX
    if (b.minY < minY) minY = b.minY
    if (b.maxX > maxX) maxX = b.maxX
    if (b.maxY > maxY) maxY = b.maxY
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

function translateTile(tile: LaserNestTile, dx: number, dy: number): LaserNestTile {
  return {
    outer: translatePoly(tile.outer, dx, dy),
    inners: tile.inners.map((p) => translatePoly(p, dx, dy)),
  }
}

function flattenNode(node: NestNode): LaserNestTile {
  const inners: LaserPolyline[] = []
  const walk = (n: NestNode, depth: number) => {
    if (depth > 0) {
      inners.push({
        closed: n.poly.closed,
        points: n.poly.points.map((q) => ({ x: q.x, y: q.y })),
      })
    }
    for (const ch of n.children) walk(ch, depth + 1)
  }
  walk(node, 0)
  return {
    outer: {
      closed: node.poly.closed,
      points: node.poly.points.map((q) => ({ x: q.x, y: q.y })),
    },
    inners,
  }
}

/**
 * Promote children of a frame-like root (image outer wall) so Layout can pack islands.
 */
function expandFrameRoots(roots: NestNode[]): NestNode[] {
  if (roots.length !== 1) return roots
  const root = roots[0]!
  if (root.children.length < 2) return roots
  const childArea = root.children.reduce((s, c) => s + c.area, 0)
  // Frame: outer much larger than sum of islands, or children are majority of content
  if (root.area > childArea * 1.4) {
    return [...root.children]
  }
  return roots
}

/**
 * Kiri Packer.#fit_simple — shelf pack tiles with spacing.
 */
export function packLaserTilesSimple(
  tiles: LaserNestTile[],
  spacingMm: number,
  bedWidth: number,
): LaserNestTile[] {
  if (!tiles.length) return []
  const spacing = Math.max(0, Number(spacingMm) || 0)
  const maxW = Math.max(1, Number(bedWidth) || 300)

  // taller first (reduces fragmentation), like prior shelf nest
  const ordered = [...tiles].sort((a, b) => tileBBox(b).h - tileBBox(a).h)

  const out: LaserNestTile[] = []
  let x = 0
  let y = 0
  let rowH = 0

  for (const tile of ordered) {
    const bb = tileBBox(tile)
    const w = bb.w
    const h = bb.h
    if (x > 0 && x + w > maxW) {
      x = 0
      y += rowH + spacing
      rowH = 0
    }
    const dx = x - bb.minX
    const dy = y - bb.minY
    out.push(translateTile(tile, dx, dy))
    x += w + spacing
    if (h > rowH) rowH = h
  }
  return out
}

export type PackLaserOpts = {
  /** Kiri ctOutGroup — inners before outers within each tile. Default true. */
  grouped?: boolean
  /**
   * Kiri skips pack when ctSliceSingle; set false to force pack anyway.
   * Default true (pack when 2+ tiles).
   */
  pack?: boolean
}

/**
 * Nest holes + pack tiles with spacing (Kiri Layout).
 * Returns flat polyline list ready for origin / travel order.
 */
export function packLaserPolylinesLayout(
  polys: LaserPolyline[],
  spacingMm: number,
  bedWidth?: number,
  opts: PackLaserOpts = {},
): LaserPolyline[] {
  if (!polys.length) return []
  const grouped = opts.grouped !== false
  const doPack = opts.pack !== false
  const bedW = bedWidth != null && Number.isFinite(bedWidth) ? Number(bedWidth) : 300

  const { roots: rawRoots, open } = nestLaserClosedPolylines(polys)
  const roots = expandFrameRoots(rawRoots)
  let tiles = roots.map(flattenNode)

  // Open paths each become a tile (no inners)
  for (const op of open) {
    tiles.push({ outer: op, inners: [] })
  }

  if (doPack && tiles.length >= 2) {
    tiles = packLaserTilesSimple(tiles, spacingMm, bedW)
  } else if (doPack && tiles.length === 1) {
    // Still normalize first tile to origin (Kiri pack places first at 0,0)
    const bb = tileBBox(tiles[0]!)
    tiles = [translateTile(tiles[0]!, -bb.minX, -bb.minY)]
  }

  const out: LaserPolyline[] = []
  for (const tile of tiles) {
    if (grouped) {
      // Kiri: cut inside before outside
      for (const inn of tile.inners) out.push(inn)
      out.push(tile.outer)
    } else {
      out.push(tile.outer)
      for (const inn of tile.inners) out.push(inn)
    }
  }
  return out
}

/**
 * Place each polyline's bbox left-to-right with `gapMm` (legacy shelf; no hole nest).
 * Prefer packLaserPolylinesLayout for Kiri Layout.
 */
export function nestLaserPolylines(
  polys: LaserPolyline[],
  gapMm: number,
  bedWidth?: number,
): LaserPolyline[] {
  const gap = Math.max(0, Number(gapMm) || 0)
  if (!polys.length) return []
  if (!(gap > 0) && !(bedWidth != null && Number.isFinite(bedWidth))) {
    return polys.map((p) => ({ closed: p.closed, points: p.points.map((q) => ({ ...q })) }))
  }

  const ordered = [...polys].sort((a, b) => {
    const ha = polyBBox(a).maxY - polyBBox(a).minY
    const hb = polyBBox(b).maxY - polyBBox(b).minY
    return hb - ha
  })

  const out: LaserPolyline[] = []
  let cursorX = 0
  let cursorY = 0
  let rowH = 0
  const maxW = bedWidth != null && Number.isFinite(bedWidth) ? bedWidth : Infinity

  for (const poly of ordered) {
    const bb = polyBBox(poly)
    const w = bb.maxX - bb.minX
    const h = bb.maxY - bb.minY
    if (cursorX > 0 && cursorX + w > maxW) {
      cursorX = 0
      cursorY += rowH + gap
      rowH = 0
    }
    const dx = cursorX - bb.minX
    const dy = cursorY - bb.minY
    out.push(translatePoly(poly, dx, dy))
    cursorX += w + gap
    if (h > rowH) rowH = h
  }
  return out
}

export type LaserNestStats = {
  placed: number
  rows: number
  width: number
  height: number
}

/** Bounding stats after nest (for tests / diagnostics). */
export function nestLaserPolylinesStats(
  polys: LaserPolyline[],
  gapMm: number,
  bedWidth?: number,
): LaserNestStats {
  const nested = nestLaserPolylines(polys, gapMm, bedWidth)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let rows = 1
  let prevY = -Infinity
  for (const poly of nested) {
    const bb = polyBBox(poly)
    if (bb.minX < minX) minX = bb.minX
    if (bb.minY < minY) minY = bb.minY
    if (bb.maxX > maxX) maxX = bb.maxX
    if (bb.maxY > maxY) maxY = bb.maxY
    if (Number.isFinite(prevY) && bb.minY > prevY + 1e-6) rows += 1
    prevY = bb.minY
  }
  if (!nested.length) return { placed: 0, rows: 0, width: 0, height: 0 }
  return {
    placed: nested.length,
    rows,
    width: maxX - minX,
    height: maxY - minY,
  }
}
