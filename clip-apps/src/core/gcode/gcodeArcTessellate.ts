/**
 * G2/G3 circular arc → polyline (G17 XY / G18 XZ / G19 YZ).
 * Center offsets follow active plane (I/J, I/K, J/K); R is radius (negative = major arc).
 */

export type GcodeArcPoint = { x: number; y: number; z: number }
export type GcodeArcPlane = 'xy' | 'xz' | 'yz'

export interface GcodeArcTessellateInput {
  start: GcodeArcPoint
  end: GcodeArcPoint
  clockwise: boolean
  plane?: GcodeArcPlane
  i?: number
  j?: number
  k?: number
  r?: number
  arcmotionDivsPerPi?: number
}

export interface GcodeArcTessellateResult {
  points: GcodeArcPoint[]
}

type UvPoint = { u: number; v: number; w: number }

/** Two circle centers from chord + radius (2D arc plane). */
export function centerFromRadius(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  radius: number,
  clockwise: boolean,
): { x: number; y: number } {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  const q = Math.hypot(x2 - x1, y2 - y1)
  if (q < 1e-9) return { x: x1, y: y1 }
  const half = q / 2
  const r2 = radius * radius
  const h2 = r2 - half * half
  const pick = (cx1: number, cy1: number, cx2: number, cy2: number) => {
    const dirX = x2 - x1
    const dirY = y2 - y1
    const cross1 = dirX * (cy1 - y1) - dirY * (cx1 - x1)
    if (clockwise) return cross1 > 0 ? { x: cx1, y: cy1 } : { x: cx2, y: cy2 }
    return cross1 < 0 ? { x: cx1, y: cy1 } : { x: cx2, y: cy2 }
  }
  if (h2 < 0) {
    const scale = r2 / (half * half + 1e-9)
    const h = Math.sqrt(Math.max(0, r2 - half * half * scale))
    const basex = (h * (y1 - y2)) / q
    const basey = (h * (x2 - x1)) / q
    const x3 = (x1 + x2) / 2
    const y3 = (y1 + y2) / 2
    return pick(x3 + basex, y3 + basey, x3 - basex, y3 - basey)
  }
  const h = Math.sqrt(h2)
  const basex = (h * (y1 - y2)) / q
  const basey = (h * (x2 - x1)) / q
  const x3 = (x1 + x2) / 2
  const y3 = (y1 + y2) / 2
  return pick(x3 + basex, y3 + basey, x3 - basex, y3 - basey)
}

export function thetaDiff(a1: number, a2: number, clockwise: boolean): number {
  let diff = a2 - a1
  while (diff < -Math.PI) diff += Math.PI * 2
  while (diff > Math.PI) diff -= Math.PI * 2
  if (clockwise && diff > 0) diff -= Math.PI * 2
  if (!clockwise && diff < 0) diff += Math.PI * 2
  return diff
}

function resolveArcCenterUv(
  start: { u: number; v: number },
  end: { u: number; v: number },
  clockwise: boolean,
  off1?: number,
  off2?: number,
  r?: number,
): { cu: number; cv: number; radius: number } | null {
  if (off1 !== undefined && off2 !== undefined) {
    const cu = start.u + off1
    const cv = start.v + off2
    const radius = Math.hypot(start.u - cu, start.v - cv)
    if (!Number.isFinite(radius) || radius < 1e-9) return null
    return { cu, cv, radius }
  }
  if (r !== undefined && Number.isFinite(r)) {
    const radius = Math.abs(r)
    if (radius < 1e-9) return null
    const chord = Math.hypot(end.u - start.u, end.v - start.v)
    let center = centerFromRadius(start, end, radius, clockwise)
    if (r < 0 && chord > 1e-9) {
      const alt = centerFromRadius(start, end, radius, !clockwise)
      const a1 = Math.atan2(start.v - center.y, start.u - center.x)
      const a2 = Math.atan2(end.v - center.y, end.u - center.x)
      const sweepMinor = Math.abs(thetaDiff(a1, a2, clockwise))
      const a1a = Math.atan2(start.v - alt.y, start.u - alt.x)
      const a2a = Math.atan2(end.v - alt.y, end.u - alt.x)
      const sweepAlt = Math.abs(thetaDiff(a1a, a2a, clockwise))
      if (sweepAlt > sweepMinor) center = alt
    }
    if (Math.abs(chord - radius * 2) < 0.001) {
      return { cu: (start.u + end.u) / 2, cv: (start.v + end.v) / 2, radius }
    }
    return { cu: center.x, cv: center.y, radius }
  }
  return null
}

function tessellateArcUv(
  start: UvPoint,
  end: UvPoint,
  clockwise: boolean,
  off1: number | undefined,
  off2: number | undefined,
  r: number | undefined,
  divsPerPi: number,
): UvPoint[] | null {
  const centerInfo = resolveArcCenterUv(
    { u: start.u, v: start.v },
    { u: end.u, v: end.v },
    clockwise,
    off1,
    off2,
    r,
  )
  if (!centerInfo) return null
  const { cu, cv, radius } = centerInfo
  if (!Number.isFinite(radius) || radius < 1e-9) return null

  const a1 = Math.atan2(start.v - cv, start.u - cu)
  const a2 = Math.atan2(end.v - cv, end.u - cu)
  let ad = thetaDiff(a1, a2, clockwise)
  const samePoint = Math.hypot(end.u - start.u, end.v - start.v) < 1e-6
  if (samePoint) ad = (Math.PI * 2) * (clockwise ? -1 : 1)

  const ofFull = Math.abs(ad) / (2 * Math.PI)
  const steps = samePoint
    ? Math.max(divsPerPi * 2, 8)
    : Math.max(Math.floor(divsPerPi * ofFull), 4)
  const step = (samePoint ? (Math.PI * 2) * (clockwise ? -1 : 1) : ad) / steps
  const wStep = (end.w - start.w) / steps

  const points: UvPoint[] = []
  let rot = a1
  let w = start.w
  for (let i = 0; i <= steps - 2; i += 1) {
    points.push({
      u: cu + radius * Math.cos(rot),
      v: cv + radius * Math.sin(rot),
      w,
    })
    w += wStep
    rot += step
  }
  return points
}

function planeMapping(plane: GcodeArcPlane) {
  if (plane === 'xz') {
    return {
      toUv: (p: GcodeArcPoint): UvPoint => ({ u: p.x, v: p.z, w: p.y }),
      fromUv: (p: UvPoint): GcodeArcPoint => ({ x: p.u, y: p.w, z: p.v }),
      off1: (i?: number, _j?: number, _k?: number) => i,
      off2: (_i?: number, _j?: number, k?: number) => k,
    }
  }
  if (plane === 'yz') {
    return {
      toUv: (p: GcodeArcPoint): UvPoint => ({ u: p.y, v: p.z, w: p.x }),
      fromUv: (p: UvPoint): GcodeArcPoint => ({ x: p.w, y: p.u, z: p.v }),
      off1: (_i?: number, j?: number, _k?: number) => j,
      off2: (_i?: number, _j?: number, k?: number) => k,
    }
  }
  return {
    toUv: (p: GcodeArcPoint): UvPoint => ({ u: p.x, v: p.y, w: p.z }),
    fromUv: (p: UvPoint): GcodeArcPoint => ({ x: p.u, y: p.v, z: p.w }),
    off1: (i?: number, _j?: number, _k?: number) => i,
    off2: (_i?: number, j?: number, _k?: number) => j,
  }
}

export function tessellateGcodeArc(input: GcodeArcTessellateInput): GcodeArcTessellateResult | null {
  const plane = input.plane ?? 'xy'
  const map = planeMapping(plane)
  const divsPerPi = input.arcmotionDivsPerPi ?? 24
  const startUv = map.toUv(input.start)
  const endUv = map.toUv(input.end)
  const off1 = map.off1(input.i, input.j, input.k)
  const off2 = map.off2(input.i, input.j, input.k)
  const uvPts = tessellateArcUv(
    startUv,
    endUv,
    input.clockwise,
    off1,
    off2,
    input.r,
    divsPerPi,
  )
  if (!uvPts) return null
  return { points: uvPts.map(map.fromUv) }
}
