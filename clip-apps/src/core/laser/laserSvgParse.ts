/**
 * SVG → laser polylines: shapes + path curves (C/Q/A/S/T), transforms, viewBox, Y-flip.
 */
export type LaserPolyline = {
  closed: boolean
  points: Array<{ x: number; y: number }>
}

type Mat = [number, number, number, number, number, number] // a b c d e f

const IDENTITY: Mat = [1, 0, 0, 1, 0, 0]

function num(v: string | null | undefined, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function mul(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
}

function applyMat(m: Mat, x: number, y: number): { x: number; y: number } {
  return { x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] }
}

function parseTransform(attr: string | null | undefined): Mat {
  if (!attr?.trim()) return IDENTITY
  let m: Mat = [...IDENTITY]
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(attr))) {
    const kind = match[1]!.toLowerCase()
    const args = match[2]!
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n))
    let t: Mat = IDENTITY
    if (kind === 'matrix' && args.length >= 6) {
      t = [args[0]!, args[1]!, args[2]!, args[3]!, args[4]!, args[5]!]
    } else if (kind === 'translate') {
      t = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0]
    } else if (kind === 'scale') {
      const sx = args[0] ?? 1
      const sy = args[1] ?? sx
      t = [sx, 0, 0, sy, 0, 0]
    } else if (kind === 'rotate') {
      const ang = ((args[0] ?? 0) * Math.PI) / 180
      const cos = Math.cos(ang)
      const sin = Math.sin(ang)
      const cx = args[1] ?? 0
      const cy = args[2] ?? 0
      t = mul([1, 0, 0, 1, cx, cy], mul([cos, sin, -sin, cos, 0, 0], [1, 0, 0, 1, -cx, -cy]))
    } else if (kind === 'skewX') {
      const tan = Math.tan(((args[0] ?? 0) * Math.PI) / 180)
      t = [1, 0, tan, 1, 0, 0]
    } else if (kind === 'skewY') {
      const tan = Math.tan(((args[0] ?? 0) * Math.PI) / 180)
      t = [1, tan, 0, 1, 0, 0]
    }
    m = mul(m, t)
  }
  return m
}

function parsePointsAttr(raw: string | null): Array<{ x: number; y: number }> {
  if (!raw?.trim()) return []
  const parts = raw.trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n))
  const out: Array<{ x: number; y: number }> = []
  for (let i = 0; i + 1 < parts.length; i += 2) {
    out.push({ x: parts[i]!, y: parts[i + 1]! })
  }
  return out
}

function sampleCubic(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  steps: number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
    const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
    pts.push({ x, y })
  }
  return pts
}

function sampleQuad(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  steps: number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2
    pts.push({ x, y })
  }
  return pts
}

/** SVG arc → center parameterization (W3C endpoint to center). */
function sampleArc(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  phiDeg: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
  steps: number,
): Array<{ x: number; y: number }> {
  if (rx === 0 || ry === 0) return [{ x: x2, y: y2 }]
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  const phi = (phiDeg * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cosPhi * dx + sinPhi * dy
  const y1p = -sinPhi * dx + cosPhi * dy
  let rxSq = rx * rx
  let rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p
  const lambda = x1pSq / rxSq + y1pSq / rySq
  if (lambda > 1) {
    const s = Math.sqrt(lambda)
    rx *= s
    ry *= s
    rxSq = rx * rx
    rySq = ry * ry
  }
  const sign = large === sweep ? -1 : 1
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq)
  const den = rxSq * y1pSq + rySq * x1pSq || 1e-12
  const coef = sign * Math.sqrt(num / den)
  const cxp = (coef * (rx * y1p)) / ry
  const cyp = (coef * -(ry * x1p)) / rx
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2
  const ux = (x1p - cxp) / rx
  const uy = (y1p - cyp) / ry
  const vx = (-x1p - cxp) / rx
  const vy = (-y1p - cyp) / ry
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const n = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1e-12
    let a = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / n)))
    if (ux * vy - uy * vx < 0) a = -a
    return a
  }
  let theta1 = angle(1, 0, ux, uy)
  let dTheta = angle(ux, uy, vx, vy)
  if (!sweep && dTheta > 0) dTheta -= Math.PI * 2
  if (sweep && dTheta < 0) dTheta += Math.PI * 2
  const n = Math.max(steps, Math.ceil((Math.abs(dTheta) / Math.PI) * steps))
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 1; i <= n; i += 1) {
    const t = theta1 + (dTheta * i) / n
    const cosT = Math.cos(t)
    const sinT = Math.sin(t)
    pts.push({
      x: cosPhi * rx * cosT - sinPhi * ry * sinT + cx,
      y: sinPhi * rx * cosT + cosPhi * ry * sinT + cy,
    })
  }
  return pts
}

/**
 * Path subset: M/L/H/V/C/S/Q/T/A/Z (absolute + relative), flattened to polylines.
 */
export function parseSimpleSvgPath(d: string): LaserPolyline[] {
  const polys: LaserPolyline[] = []
  let cur: Array<{ x: number; y: number }> = []
  let closed = false
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let lastCx = 0
  let lastCy = 0
  let lastCmd = ''
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) || []
  let i = 0
  const isCmd = (t: string) => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(t)
  const flush = () => {
    if (cur.length >= 2) polys.push({ closed, points: cur })
    cur = []
    closed = false
  }
  const pushPt = (nx: number, ny: number) => {
    x = nx
    y = ny
    cur.push({ x, y })
  }
  while (i < tokens.length) {
    let cmd = tokens[i]!
    if (!isCmd(cmd)) {
      i += 1
      continue
    }
    const rel = cmd === cmd.toLowerCase()
    const base = cmd.toUpperCase()
    i += 1
    if (base === 'M') {
      flush()
      const nx = num(tokens[i++])
      const ny = num(tokens[i++])
      pushPt(rel ? x + nx : nx, rel ? y + ny : ny)
      sx = x
      sy = y
      lastCmd = 'M'
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        const ax = num(tokens[i++])
        const ay = num(tokens[i++])
        pushPt(rel ? x + ax : ax, rel ? y + ay : ay)
        lastCmd = 'L'
      }
      continue
    }
    if (base === 'L') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        const ax = num(tokens[i++])
        const ay = num(tokens[i++])
        pushPt(rel ? x + ax : ax, rel ? y + ay : ay)
      }
      lastCmd = 'L'
      continue
    }
    if (base === 'H') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        const ax = num(tokens[i++])
        pushPt(rel ? x + ax : ax, y)
      }
      lastCmd = 'L'
      continue
    }
    if (base === 'V') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        const ay = num(tokens[i++])
        pushPt(x, rel ? y + ay : ay)
      }
      lastCmd = 'L'
      continue
    }
    if (base === 'C') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        let x1 = num(tokens[i++])
        let y1 = num(tokens[i++])
        let x2 = num(tokens[i++])
        let y2 = num(tokens[i++])
        let x3 = num(tokens[i++])
        let y3 = num(tokens[i++])
        if (rel) {
          x1 += x
          y1 += y
          x2 += x
          y2 += y
          x3 += x
          y3 += y
        }
        cur.push(...sampleCubic(x, y, x1, y1, x2, y2, x3, y3, 16))
        lastCx = x2
        lastCy = y2
        x = x3
        y = y3
      }
      lastCmd = 'C'
      continue
    }
    if (base === 'S') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        let x2 = num(tokens[i++])
        let y2 = num(tokens[i++])
        let x3 = num(tokens[i++])
        let y3 = num(tokens[i++])
        if (rel) {
          x2 += x
          y2 += y
          x3 += x
          y3 += y
        }
        const x1 = lastCmd === 'C' || lastCmd === 'S' ? 2 * x - lastCx : x
        const y1 = lastCmd === 'C' || lastCmd === 'S' ? 2 * y - lastCy : y
        cur.push(...sampleCubic(x, y, x1, y1, x2, y2, x3, y3, 16))
        lastCx = x2
        lastCy = y2
        x = x3
        y = y3
      }
      lastCmd = 'S'
      continue
    }
    if (base === 'Q') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        let x1 = num(tokens[i++])
        let y1 = num(tokens[i++])
        let x2 = num(tokens[i++])
        let y2 = num(tokens[i++])
        if (rel) {
          x1 += x
          y1 += y
          x2 += x
          y2 += y
        }
        cur.push(...sampleQuad(x, y, x1, y1, x2, y2, 12))
        lastCx = x1
        lastCy = y1
        x = x2
        y = y2
      }
      lastCmd = 'Q'
      continue
    }
    if (base === 'T') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        let x2 = num(tokens[i++])
        let y2 = num(tokens[i++])
        if (rel) {
          x2 += x
          y2 += y
        }
        const x1 = lastCmd === 'Q' || lastCmd === 'T' ? 2 * x - lastCx : x
        const y1 = lastCmd === 'Q' || lastCmd === 'T' ? 2 * y - lastCy : y
        cur.push(...sampleQuad(x, y, x1, y1, x2, y2, 12))
        lastCx = x1
        lastCy = y1
        x = x2
        y = y2
      }
      lastCmd = 'T'
      continue
    }
    if (base === 'A') {
      while (i < tokens.length && !isCmd(tokens[i]!)) {
        const rx = num(tokens[i++])
        const ry = num(tokens[i++])
        const rot = num(tokens[i++])
        const large = num(tokens[i++]) !== 0
        const sweep = num(tokens[i++]) !== 0
        let x2 = num(tokens[i++])
        let y2 = num(tokens[i++])
        if (rel) {
          x2 += x
          y2 += y
        }
        cur.push(...sampleArc(x, y, rx, ry, rot, large, sweep, x2, y2, 24))
        x = x2
        y = y2
      }
      lastCmd = 'A'
      continue
    }
    if (base === 'Z') {
      closed = true
      x = sx
      y = sy
      flush()
      lastCmd = 'Z'
      continue
    }
  }
  flush()
  return polys
}

function mapPoly(poly: LaserPolyline, m: Mat): LaserPolyline {
  return {
    closed: poly.closed,
    points: poly.points.map((p) => applyMat(m, p.x, p.y)),
  }
}

/** Flip SVG Y (screen-down → machine-up) then shift so minY = 0. */
export function normalizeLaserSvgY(polys: LaserPolyline[]): LaserPolyline[] {
  if (!polys.length) return polys
  const flipped = polys.map((p) => ({
    closed: p.closed,
    points: p.points.map((q) => ({ x: q.x, y: -q.y })),
  }))
  let minY = Infinity
  for (const p of flipped) {
    for (const q of p.points) if (q.y < minY) minY = q.y
  }
  if (!Number.isFinite(minY)) return flipped
  return flipped.map((p) => ({
    closed: p.closed,
    points: p.points.map((q) => ({ x: q.x, y: q.y - minY })),
  }))
}

function parseViewBoxScale(svgEl: Element | null): Mat {
  if (!svgEl) return IDENTITY
  const vb = svgEl.getAttribute('viewBox')
  if (!vb) return IDENTITY
  const parts = vb.trim().split(/[\s,]+/).map(Number)
  if (parts.length < 4) return IDENTITY
  const [minX, minY, vbW, vbH] = parts
  if (!vbW || !vbH) return IDENTITY
  const wAttr = num(svgEl.getAttribute('width'), vbW)
  const hAttr = num(svgEl.getAttribute('height'), vbH)
  // If width/height are unitless or missing meaningful px, keep viewBox coords as mm-ish.
  const sx = Number.isFinite(wAttr) && wAttr > 0 ? wAttr / vbW : 1
  const sy = Number.isFinite(hAttr) && hAttr > 0 ? hAttr / vbH : 1
  // Prefer uniform scale when svg width≈height ratio unknown; use min to avoid stretch.
  const s = Math.min(sx, sy)
  return mul([s, 0, 0, s, 0, 0], [1, 0, 0, 1, -(minX ?? 0), -(minY ?? 0)])
}

export function parseSvgToLaserPolylines(svgText: string): LaserPolyline[] {
  if (typeof DOMParser === 'undefined') {
    return normalizeLaserSvgY(parseSvgTextFallback(svgText))
  }
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const root = doc.documentElement
  const vbMat = parseViewBoxScale(root)
  const out: LaserPolyline[] = []

  const walk = (el: Element, parentMat: Mat) => {
    const local = parseTransform(el.getAttribute('transform'))
    const m = mul(parentMat, local)
    const tag = el.tagName.toLowerCase()
    if (tag === 'rect') {
      const x = num(el.getAttribute('x'))
      const y = num(el.getAttribute('y'))
      const w = num(el.getAttribute('width'))
      const h = num(el.getAttribute('height'))
      if (w > 0 && h > 0) {
        out.push(
          mapPoly(
            {
              closed: true,
              points: [
                { x, y },
                { x: x + w, y },
                { x: x + w, y: y + h },
                { x, y: y + h },
              ],
            },
            m,
          ),
        )
      }
    } else if (tag === 'circle') {
      const cx = num(el.getAttribute('cx'))
      const cy = num(el.getAttribute('cy'))
      const r = num(el.getAttribute('r'))
      if (r > 0) {
        const pts: Array<{ x: number; y: number }> = []
        const n = 48
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2
          pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
        }
        out.push(mapPoly({ closed: true, points: pts }, m))
      }
    } else if (tag === 'ellipse') {
      const cx = num(el.getAttribute('cx'))
      const cy = num(el.getAttribute('cy'))
      const rx = num(el.getAttribute('rx'))
      const ry = num(el.getAttribute('ry'))
      if (rx > 0 && ry > 0) {
        const pts: Array<{ x: number; y: number }> = []
        const n = 48
        for (let i = 0; i < n; i += 1) {
          const a = (i / n) * Math.PI * 2
          pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry })
        }
        out.push(mapPoly({ closed: true, points: pts }, m))
      }
    } else if (tag === 'line') {
      out.push(
        mapPoly(
          {
            closed: false,
            points: [
              { x: num(el.getAttribute('x1')), y: num(el.getAttribute('y1')) },
              { x: num(el.getAttribute('x2')), y: num(el.getAttribute('y2')) },
            ],
          },
          m,
        ),
      )
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pts = parsePointsAttr(el.getAttribute('points'))
      if (pts.length >= 2) out.push(mapPoly({ closed: tag === 'polygon', points: pts }, m))
    } else if (tag === 'path') {
      const d = el.getAttribute('d') || ''
      for (const poly of parseSimpleSvgPath(d)) out.push(mapPoly(poly, m))
    }
    for (const child of Array.from(el.children)) walk(child as Element, m)
  }

  walk(root, vbMat)
  return normalizeLaserSvgY(out)
}

/** Regex fallback for Node tests without DOMParser (no transform/viewBox). */
export function parseSvgTextFallback(svgText: string): LaserPolyline[] {
  const out: LaserPolyline[] = []
  const rectRe = /<rect\b([^>]*)\/?>/gi
  let m: RegExpExecArray | null
  while ((m = rectRe.exec(svgText))) {
    const attrs = m[1] || ''
    const get = (name: string) => {
      const am = attrs.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
      return am?.[1] ?? null
    }
    const x = num(get('x'))
    const y = num(get('y'))
    const w = num(get('width'))
    const h = num(get('height'))
    if (w > 0 && h > 0) {
      out.push({
        closed: true,
        points: [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ],
      })
    }
  }
  const pathRe = /<path\b[^>]*\bd\s*=\s*["']([^"']+)["'][^>]*\/?>/gi
  while ((m = pathRe.exec(svgText))) {
    out.push(...parseSimpleSvgPath(m[1] || ''))
  }
  const polyRe = /<(polygon|polyline)\b([^>]*)\/?>/gi
  while ((m = polyRe.exec(svgText))) {
    const tag = (m[1] || '').toLowerCase()
    const attrs = m[2] || ''
    const pm = attrs.match(/points\s*=\s*["']([^"']*)["']/i)
    const pts = parsePointsAttr(pm?.[1] ?? null)
    if (pts.length >= 2) out.push({ closed: tag === 'polygon', points: pts })
  }
  return out
}

export function laserSampleSquare(size = 40, origin = 10): LaserPolyline[] {
  const o = origin
  const s = size
  return [
    {
      closed: true,
      points: [
        { x: o, y: o },
        { x: o + s, y: o },
        { x: o + s, y: o + s },
        { x: o, y: o + s },
      ],
    },
  ]
}
