import type { SliceLayerPreview, SlicePath2D } from '@/api/slice'

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
 * Used for **`top.fill_lines`**, **`top.thin_fill`**, and **`slice.lines`** (travel).
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

/** Legacy `slice.lines`: `{ p1, p2 }`, `{ start, end }`, line tuples, or flat paired `Point` rows. */
function pushSliceLines(paths: SlicePath2D[], lines: any[] | undefined) {
  pushSegmentArray(paths, lines, 'travel', { startEndWrap: true })
}

/** Kiri `thin_wall` traces: arrays of `{x,y}` points (see legacy `fdm/post.js`). */
function pushThinWallTraces(paths: SlicePath2D[], traces: any) {
  if (!Array.isArray(traces)) return
  for (const trace of traces) {
    if (!Array.isArray(trace)) continue
    for (let i = 1; i < trace.length; i++) {
      const a = trace[i - 1]
      const b = trace[i]
      if (!a || !b) continue
      const path = lineToPath({ p1: a, p2: b }, 'perimeter')
      if (path) paths.push(path)
    }
  }
}

export function convertWidgetSlicesToLayers(slices: any[]): SliceLayerPreview[] {
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
      // Slice outline when shell polygons are not emitted yet (pre-/thin-shell paths).
      if (shellPathCount === 0 && top.poly) {
        const outline = polyToPath(top.poly, 'perimeter')
        if (outline) paths.push(outline)
      }

      pushPolyList(paths, top.last, 'perimeter')
      pushPolyList(paths, top.fill_off, 'infill')
      pushPolyList(paths, top.gaps, 'infill')

      // Same line layouts as `fill_lines`: `addLines(top.thin_fill)` in `fdm/slice.js`; includes
      // flat pairs from `cullIntersections` / `fillArea` (`post.js` thin shell path).
      pushFillLines(paths, top.thin_fill)

      pushThinWallTraces(paths, top.thin_wall)

      pushFillLines(paths, top.fill_lines)
      const sparse = Array.isArray(top.fill_sparse) ? top.fill_sparse : []
      for (const poly of sparse) {
        const path = polyToPath(poly, 'infill')
        if (path) paths.push(path)
      }

      pushPolyList(paths, top.solids, 'infill')
      pushPolyList(paths, top.bridges, 'infill')
    }

    pushPolyList(paths, s.groups, 'perimeter')
    pushPolyList(paths, s.solids, 'infill')
    pushPolyList(paths, s.bridges, 'infill')
    pushPolyList(paths, s.flats, 'infill')

    pushSliceLines(paths, s.lines)

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
