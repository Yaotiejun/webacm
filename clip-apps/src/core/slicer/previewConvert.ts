import type { SliceLayerPreview, SlicePath2D } from '@/api/slice'

export type ConvertWidgetSlicesOptions = {
  /**
   * Match Kiri `layerRender` devel/xray extras (gaps, fill_off, last, solids, bridges, flats, lines, groups).
   * Default false = Kiri normal slice view.
   */
  devel?: boolean
  xray?: boolean
}

export function polyToPath(poly: any, type: SlicePath2D['type']): SlicePath2D | null {
  const arr: Array<[number, number]> = []
  const pts = poly?.points
  if (!Array.isArray(pts) || pts.length < 2) return null
  for (const p of pts) {
    const x = p?.x ?? (Array.isArray(p) ? p[0] : undefined)
    const y = p?.y ?? (Array.isArray(p) ? p[1] : undefined)
    if (typeof x !== 'number' || typeof y !== 'number') continue
    arr.push([x, y])
  }
  if (arr.length < 2) return null
  const first = arr[0]
  const last = arr[arr.length - 1]
  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    arr.push([first[0], first[1]])
  }
  return { type, points: arr }
}

export function lineToPath(line: any, type: SlicePath2D['type']): SlicePath2D | null {
  const p1 = (line && (line.p1 ?? line[0])) as any
  const p2 = (line && (line.p2 ?? line[1])) as any
  if (!p1 || !p2) return null

  const x1 = p1.x ?? p1.X ?? p1[0]
  const y1 = p1.y ?? p1.Y ?? p1[1]
  const x2 = p2.x ?? p2.X ?? p2[0]
  const y2 = p2.y ?? p2.Y ?? p2[1]
  if ([x1, y1, x2, y2].some((v) => typeof v !== 'number')) return null
  return { type, points: [[x1, y1], [x2, y2]] }
}

function pushPolyList(paths: SlicePath2D[], polys: any[] | undefined, type: SlicePath2D['type']) {
  if (!Array.isArray(polys)) return
  for (const poly of polys) {
    const path = polyToPath(poly, type)
    if (path) paths.push(path)
  }
}

function isLineLikeRecord(ln: any): boolean {
  if (ln == null || typeof ln !== 'object') return false
  if (Array.isArray(ln) && ln.length >= 2) return true
  const p1 = ln.p1 ?? ln[0]
  const p2 = ln.p2 ?? ln[1]
  return p1 != null && p2 != null
}

function resolveLineAsType(
  ln: any,
  type: SlicePath2D['type'],
  opts?: { startEndWrap?: boolean },
): SlicePath2D | null {
  const path = lineToPath(ln, type)
  if (path) return path
  if (opts?.startEndWrap && ln?.start && ln?.end) {
    return lineToPath({ p1: ln.start, p2: ln.end }, type)
  }
  return null
}

/**
 * Line records (`{ p1, p2 }`, `[a,b]`, …) **or** flat paired endpoints (same layout as
 * `POLY.fillArea` output and paired `Point` pushes in `post.js` / `slice.js`).
 */
function pushSegmentArray(
  paths: SlicePath2D[],
  segments: any[] | undefined,
  type: SlicePath2D['type'],
  opts?: { startEndWrap?: boolean },
) {
  if (!Array.isArray(segments) || segments.length === 0) return

  if (segments.every((e) => isLineLikeRecord(e))) {
    for (const ln of segments) {
      const path = resolveLineAsType(ln, type, opts)
      if (path) paths.push(path)
    }
    return
  }

  if (segments.length % 2 === 0) {
    const paired: SlicePath2D[] = []
    for (let i = 0; i + 1 < segments.length; i += 2) {
      if (isLineLikeRecord(segments[i]) || isLineLikeRecord(segments[i + 1])) {
        paired.length = 0
        break
      }
      const path = lineToPath({ p1: segments[i], p2: segments[i + 1] }, type)
      if (path) paired.push(path)
    }
    if (paired.length === segments.length / 2) {
      for (const p of paired) paths.push(p)
      return
    }
  }

  for (const ln of segments) {
    const path = resolveLineAsType(ln, type, opts)
    if (path) paths.push(path)
  }
}

function pushFillLines(paths: SlicePath2D[], fillLines: any[] | undefined) {
  pushSegmentArray(paths, fillLines, 'infill')
}

function pushSliceLines(paths: SlicePath2D[], lines: any[] | undefined) {
  pushSegmentArray(paths, lines, 'travel', { startEndWrap: true })
}

/** Approximate Kiri `centerCircle(p, r, 12)` for thin_wall single-point walls. */
function circlePath(cx: number, cy: number, r: number, type: SlicePath2D['type']): SlicePath2D | null {
  if (!(r > 0) || !Number.isFinite(cx) || !Number.isFinite(cy)) return null
  const pts: Array<[number, number]> = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return { type, points: pts }
}

/**
 * Kiri non-thin `thin_wall`: length-1 → circle(r/2); else closed polyline through points.
 * @see grid-apps `fdm/work/slice.js` layerRender
 */
function pushThinWallKiriStyle(paths: SlicePath2D[], traces: any) {
  if (!Array.isArray(traces)) return
  for (const trace of traces) {
    if (!Array.isArray(trace) || trace.length === 0) continue
    if (trace.length === 1) {
      const p = trace[0]
      const x = Number(p?.x)
      const y = Number(p?.y)
      const r = Number(p?.r)
      const path = circlePath(x, y, (Number.isFinite(r) && r > 0 ? r : 0.2) / 2, 'perimeter')
      if (path) paths.push(path)
      continue
    }
    const path = polyToPath({ points: trace }, 'perimeter')
    if (path) paths.push(path)
  }
}

/**
 * Convert legacy `widget.slices` to 2D preview layers using **Kiri `layerRender` defaults**
 * (shells, fill_lines, fill_sparse, thin_fill, thin_wall, supports).
 * Devel/xray extras are opt-in so the canvas matches Kiri's normal slice view.
 */
export function convertWidgetSlicesToLayers(
  slices: any[],
  opts?: ConvertWidgetSlicesOptions,
): SliceLayerPreview[] {
  const devel = Boolean(opts?.devel)
  const xray = Boolean(opts?.xray)
  const layers: SliceLayerPreview[] = []

  for (const s of slices || []) {
    if (!s) continue
    const z = typeof s.z === 'number' ? s.z : 0
    const paths: SlicePath2D[] = []

    const tops = Array.isArray(s.tops) ? s.tops : []
    for (const top of tops) {
      if (!top) continue
      const shells = Array.isArray(top.shells) ? top.shells : []
      let shellPathCount = 0
      for (const shell of shells) {
        const path = polyToPath(shell, 'perimeter')
        if (path) {
          paths.push(path)
          shellPathCount++
        }
      }
      // Fallback outline only when no shells yet (pre-shell / thin path).
      if (shellPathCount === 0 && top.poly) {
        const outline = polyToPath(top.poly, 'perimeter')
        if (outline) paths.push(outline)
      }

      pushThinWallKiriStyle(paths, top.thin_wall)
      pushFillLines(paths, top.fill_lines)
      pushPolyList(paths, top.fill_sparse, 'infill')
      pushFillLines(paths, top.thin_fill)

      if (devel) {
        pushPolyList(paths, top.gaps, 'infill')
        pushPolyList(paths, top.fill_off, 'infill')
        pushPolyList(paths, top.last, 'perimeter')
        pushPolyList(paths, top.solids, 'infill')
        pushPolyList(paths, top.bridges, 'infill')
      }
    }

    if (devel) {
      pushPolyList(paths, s.solids, 'infill')
      pushPolyList(paths, s.bridges, 'infill')
      pushPolyList(paths, s.flats, 'infill')
    }

    if (xray) {
      pushPolyList(paths, s.groups, 'perimeter')
      pushSliceLines(paths, s.lines)
    }

    // Kiri always draws support outlines + support.fill (when present).
    const supports = Array.isArray(s.supports) ? s.supports : []
    for (const sup of supports) {
      const path = polyToPath(sup, 'support')
      if (path) paths.push(path)
      pushSegmentArray(paths, sup?.fill, 'support')
    }

    if (paths.length) layers.push({ z, paths })
  }
  return layers
}

/**
 * Merge multiple widgets' slice stacks by Z (Kiri multi-part preview).
 * Paths from later widgets append onto the same layer key.
 */
export function mergeWidgetSlicesToLayers(
  widgets: Array<{ slices?: any[] }>,
  opts?: ConvertWidgetSlicesOptions,
): SliceLayerPreview[] {
  const byZ = new Map<number, SlicePath2D[]>()
  const zOrder: number[] = []

  for (const w of widgets || []) {
    const layers = convertWidgetSlicesToLayers(w.slices || [], opts)
    for (const layer of layers) {
      const zKey = Number(layer.z.toFixed(3))
      let paths = byZ.get(zKey)
      if (!paths) {
        paths = []
        byZ.set(zKey, paths)
        zOrder.push(zKey)
      }
      paths.push(...layer.paths)
    }
  }

  zOrder.sort((a, b) => a - b)
  return zOrder.map((z) => ({ z, paths: byZ.get(z) || [] })).filter((l) => l.paths.length > 0)
}

/** Bounds from path points (Kiri-like framing); falls back to null if empty. */
export function computePreviewBoundsFromLayers(
  layers: SliceLayerPreview[],
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const layer of layers) {
    for (const path of layer.paths) {
      for (const pt of path.points) {
        const x = pt[0]
        const y = pt[1]
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (!(maxX > minX) || !(maxY > minY)) return null
  const padX = Math.max(0.5, (maxX - minX) * 0.02)
  const padY = Math.max(0.5, (maxY - minY) * 0.02)
  return {
    minX: minX - padX,
    minY: minY - padY,
    maxX: maxX + padX,
    maxY: maxY + padY,
  }
}
