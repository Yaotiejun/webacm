/**
 * TypeScript port of Kiri-Moto image → heightmap → Laser slice contours.
 *
 * Kiri: load/png.js heightfield mesh → geo/slicer plane cut at ctSliceHeight.
 * Here: same height field + marching-squares with linear edge interpolation
 * (equivalent to slicing a grid heightfield mesh), then prepare/export.
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserImageConvertOpts = {
  /** Target width in mm. If omitted and bedWidth/bedDepth set, fit like Kiri. */
  widthMm?: number
  /** Device bed (Kiri: outWidth=bedDepth, outHeight=bedWidth). */
  bedWidth?: number
  bedDepth?: number
  /** Blur iterations (Kiri png-blur). Default 0. */
  blur?: number
  /** Base thickness in mm under opaque pixels. Default 0. */
  base?: number
  /** Border force-white thickness in px. Default 0. */
  border?: number
  invImage?: boolean
  invAlpha?: boolean
  /** Max source width px before downsample. Default 1000 (Kiri warn threshold). */
  maxWidthPx?: number
  /** single = one Z plane (Kiri ctSliceSingle); layers = step by sliceHeightMm. */
  sliceMode?: 'single' | 'layers'
  /** Fallback fraction of zMax if absolute Z yields nothing. Default 0.35. */
  singleLevel?: number
  /** Absolute slice Z / layer pitch in mm (Kiri ctSliceHeight). Default 1. */
  sliceHeightMm?: number
  /** Max layer count. Default 48. */
  maxLayers?: number
}

export type LaserHeightmap = {
  width: number
  height: number
  z: Float32Array
  scale: number
  widthMm: number
  heightMm: number
  zMax: number
}

/** Kiri image2mesh bed fit: outWidth=bedDepth, outHeight=bedWidth. */
export function fitLaserImageToBed(
  pxW: number,
  pxH: number,
  bedWidth: number,
  bedDepth: number,
): { widthMm: number; heightMm: number; scale: number } {
  const w = Math.max(1, pxW)
  const h = Math.max(1, pxH)
  const outWidth = Math.max(1e-6, bedDepth)
  const outHeight = Math.max(1e-6, bedWidth)
  const imageAspect = h / w
  const deviceAspect = outHeight / outWidth
  const div = imageAspect < deviceAspect ? w / outWidth : h / outHeight
  const scale = 1 / div
  return { widthMm: w * scale, heightMm: h * scale, scale }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

/** Build grayscale (+ alpha) like Kiri png.parse, then height = gray/50 + base*alpha. */
export function canvasToHeightmap(
  img: HTMLImageElement,
  opts: LaserImageConvertOpts = {},
): LaserHeightmap {
  const maxW = Math.max(48, Math.floor(Number(opts.maxWidthPx) || 1000))
  const srcW = Math.max(1, img.naturalWidth || img.width)
  const srcH = Math.max(1, img.naturalHeight || img.height)
  const down = srcW > maxW ? maxW / srcW : 1
  const width = Math.max(1, Math.round(srcW * down))
  const height = Math.max(1, Math.round(srcH * down))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(img, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height).data

  const invi = Boolean(opts.invImage)
  const inva = Boolean(opts.invAlpha)
  const border = Math.max(0, Math.floor(Number(opts.border) || 0))
  let gray = new Uint8Array(width * height)
  const alpha = new Uint8Array(width * height)

  for (let y = 0, gi = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1, gi += 1) {
      const di = (x + width * y) * 4
      let r = data[di] ?? 0
      let g = data[di + 1] ?? 0
      let b = data[di + 2] ?? 0
      let a = data[di + 3] ?? 255
      let v = Math.round((r + g + b) / 3)
      if (inva) a = 255 - a
      if (invi) v = 255 - v
      if (border && (x < border || y < border || x > width - border - 1 || y > height - border - 1)) {
        v = 255
      }
      alpha[gi] = a
      gray[gi] = Math.round(v * (a / 255))
    }
  }

  let blurN = Math.max(0, Math.floor(Number(opts.blur) || 0))
  while (blurN-- > 0) {
    const next = new Uint8Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const xl = Math.max(x - 1, 0)
        const xr = Math.min(x + 1, width - 1)
        const yu = Math.max(y - 1, 0)
        const yd = Math.min(y + 1, height - 1)
        const id = x + width * y
        next[id] = Math.round(
          (gray[xl + width * yu]! +
            gray[x + width * yu]! +
            gray[xr + width * yu]! +
            gray[xl + width * y]! +
            gray[id]! * 8 +
            gray[xr + width * y]! +
            gray[xl + width * yd]! +
            gray[x + width * yd]! +
            gray[xr + width * yd]!) /
            16,
        )
      }
    }
    gray = next
  }

  // Kiri image2mesh: fit into bed (outWidth=bedDepth, outHeight=bedWidth)
  const bedW = Number(opts.bedWidth)
  const bedD = Number(opts.bedDepth)
  let widthMm: number
  let heightMm: number
  let scale: number
  if (bedW > 0 && bedD > 0 && !(Number(opts.widthMm) > 0)) {
    const fit = fitLaserImageToBed(width, height, bedW, bedD)
    scale = fit.scale
    widthMm = fit.widthMm
    heightMm = fit.heightMm
  } else {
    widthMm = Math.max(1, Number(opts.widthMm) || 80)
    scale = widthMm / width
    heightMm = height * scale
  }
  const base = Math.max(0, Number(opts.base) || 0)
  const z = new Float32Array(width * height)
  let zMax = 0
  for (let i = 0; i < gray.length; i += 1) {
    const zz = gray[i]! / 50 + (base * alpha[i]!) / 255
    z[i] = zz
    if (zz > zMax) zMax = zz
  }

  return { width, height, z, scale, widthMm, heightMm, zMax }
}

export async function loadImageFileToHeightmap(
  file: File,
  opts: LaserImageConvertOpts = {},
): Promise<LaserHeightmap> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    return canvasToHeightmap(img, opts)
  } finally {
    URL.revokeObjectURL(url)
  }
}

type Pt = { x: number; y: number }

function mmOf(hm: LaserHeightmap, px: number, py: number): Pt {
  // Match arrange mesh + Kiri png verts: centered, image row0 → +Y
  return {
    x: px * hm.scale - hm.widthMm / 2,
    y: (hm.height - 1 - py) * hm.scale - hm.heightMm / 2,
  }
}

function lerpEdge(
  hm: LaserHeightmap,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  level: number,
): Pt {
  const dz = z1 - z0
  const t = Math.abs(dz) < 1e-12 ? 0.5 : (level - z0) / dz
  const tt = Math.max(0, Math.min(1, t))
  return mmOf(hm, x0 + (x1 - x0) * tt, y0 + (y1 - y0) * tt)
}

/**
 * Marching-squares iso-contours at absolute Z (Kiri heightfield plane cut).
 * Linear interpolation on edges ≈ triangle mesh slice on a regular grid.
 */
export function marchingSquaresAtLevel(hm: LaserHeightmap, level: number): LaserPolyline[] {
  const { width: w, height: h, z } = hm
  const segs: LaserPolyline[] = []
  const push = (a: Pt, b: Pt) => {
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9) return
    segs.push({ closed: false, points: [a, b] })
  }

  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const z00 = z[y * w + x]!
      const z10 = z[y * w + (x + 1)]!
      const z01 = z[(y + 1) * w + x]!
      const z11 = z[(y + 1) * w + (x + 1)]!
      const c0 = z00 >= level ? 1 : 0
      const c1 = z10 >= level ? 1 : 0
      const c2 = z11 >= level ? 1 : 0
      const c3 = z01 >= level ? 1 : 0
      const code = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3)
      if (code === 0 || code === 15) continue

      const top = () => lerpEdge(hm, x, y, z00, x + 1, y, z10, level)
      const right = () => lerpEdge(hm, x + 1, y, z10, x + 1, y + 1, z11, level)
      const bottom = () => lerpEdge(hm, x, y + 1, z01, x + 1, y + 1, z11, level)
      const left = () => lerpEdge(hm, x, y, z00, x, y + 1, z01, level)

      // Cases: edge midpoints connected (standard MS)
      switch (code) {
        case 1:
        case 14:
          push(left(), top())
          break
        case 2:
        case 13:
          push(top(), right())
          break
        case 3:
        case 12:
          push(left(), right())
          break
        case 4:
        case 11:
          push(right(), bottom())
          break
        case 5: // saddle — split by avg
          if ((z00 + z10 + z01 + z11) / 4 >= level) {
            push(left(), top())
            push(right(), bottom())
          } else {
            push(top(), right())
            push(left(), bottom())
          }
          break
        case 6:
        case 9:
          push(top(), bottom())
          break
        case 7:
        case 8:
          push(left(), bottom())
          break
        case 10: // saddle
          if ((z00 + z10 + z01 + z11) / 4 >= level) {
            push(top(), right())
            push(left(), bottom())
          } else {
            push(left(), top())
            push(right(), bottom())
          }
          break
        default:
          break
      }
    }
  }

  return stitchContourSegments(segs, hm.scale * 0.35)
}

/** @deprecated alias — prefer marchingSquaresAtLevel */
export function mooreContoursAtLevel(hm: LaserHeightmap, level: number): LaserPolyline[] {
  return marchingSquaresAtLevel(hm, level)
}

export function contoursAtLevel(hm: LaserHeightmap, level: number): LaserPolyline[] {
  return marchingSquaresAtLevel(hm, level)
}

/** Merge unit segments into longer polylines (hash-indexed, Kiri sliceConnect-like). */
export function stitchContourSegments(segments: LaserPolyline[], eps = 1e-4): LaserPolyline[] {
  if (segments.length < 2) return segments
  type Seg = { a: Pt; b: Pt; used: boolean }
  const segs: Seg[] = segments.map((p) => ({
    a: { x: p.points[0]!.x, y: p.points[0]!.y },
    b: { x: p.points[1]!.x, y: p.points[1]!.y },
    used: false,
  }))
  const key = (p: Pt) => `${Math.round(p.x / eps)}:${Math.round(p.y / eps)}`
  const buckets = new Map<string, number[]>()
  const add = (p: Pt, i: number) => {
    const k = key(p)
    const arr = buckets.get(k)
    if (arr) arr.push(i)
    else buckets.set(k, [i])
  }
  for (let i = 0; i < segs.length; i += 1) {
    add(segs[i]!.a, i)
    add(segs[i]!.b, i)
  }
  const near = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y) <= eps * 2
  const candidates = (p: Pt) => {
    const found: number[] = []
    const bx = Math.round(p.x / eps)
    const by = Math.round(p.y / eps)
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const arr = buckets.get(`${bx + dx}:${by + dy}`)
        if (arr) found.push(...arr)
      }
    }
    return found
  }

  const out: LaserPolyline[] = []
  for (let i = 0; i < segs.length; i += 1) {
    if (segs[i]!.used) continue
    segs[i]!.used = true
    const pts = [segs[i]!.a, segs[i]!.b]
    let extended = true
    while (extended) {
      extended = false
      const head = pts[0]!
      const tail = pts[pts.length - 1]!
      for (const end of [tail, head] as const) {
        const isTail = end === tail
        for (const j of candidates(end)) {
          const s = segs[j]!
          if (s.used) continue
          if (isTail && near(tail, s.a)) {
            pts.push(s.b)
            s.used = true
            extended = true
            break
          }
          if (isTail && near(tail, s.b)) {
            pts.push(s.a)
            s.used = true
            extended = true
            break
          }
          if (!isTail && near(head, s.b)) {
            pts.unshift(s.a)
            s.used = true
            extended = true
            break
          }
          if (!isTail && near(head, s.a)) {
            pts.unshift(s.b)
            s.used = true
            extended = true
            break
          }
        }
        if (extended) break
      }
    }
    if (pts.length >= 2) {
      const closed = near(pts[0]!, pts[pts.length - 1]!)
      out.push({ closed, points: closed && pts.length > 2 ? pts.slice(0, -1) : pts })
    }
  }
  return out
}

function polyLen(p: LaserPolyline): number {
  let len = 0
  for (let i = 1; i < p.points.length; i += 1) {
    len += Math.hypot(p.points[i]!.x - p.points[i - 1]!.x, p.points[i]!.y - p.points[i - 1]!.y)
  }
  if (p.closed && p.points.length > 2) {
    const a = p.points[0]!
    const b = p.points[p.points.length - 1]!
    len += Math.hypot(a.x - b.x, a.y - b.y)
  }
  return len
}

function simplifyPoly(p: LaserPolyline, tol: number): LaserPolyline {
  if (p.points.length < 4 || tol <= 0) return p
  const pts = p.points
  const keep: typeof pts = [pts[0]!]
  for (let i = 1; i < pts.length - 1; i += 1) {
    const a = keep[keep.length - 1]!
    const b = pts[i]!
    const c = pts[i + 1]!
    const abx = b.x - a.x
    const aby = b.y - a.y
    const acx = c.x - a.x
    const acy = c.y - a.y
    const cross = Math.abs(abx * acy - aby * acx)
    const ab = Math.hypot(abx, aby) || 1e-9
    if (cross / ab > tol) keep.push(b)
  }
  keep.push(pts[pts.length - 1]!)
  return { closed: p.closed, points: keep }
}

/**
 * Convert heightmap → laser cut polylines (Kiri Laser slice of image mesh).
 * Single: absolute Z = sliceHeightMm (ctSliceHeight). Layers: zMin+h/2 step h.
 */
export function heightmapToLaserPolylines(
  hm: LaserHeightmap,
  opts: LaserImageConvertOpts = {},
): LaserPolyline[] {
  if (hm.zMax <= 1e-6) {
    throw new Error('image has no height (try invert / blur)')
  }
  const mode = opts.sliceMode || 'single'
  const step = Math.max(0, Number(opts.sliceHeightMm))
  if (step < 0) throw new Error('invalid slice height')
  const h = step > 0 ? step : 1
  const levels: number[] = []

  if (mode === 'layers') {
    const maxL = Math.max(1, Math.floor(Number(opts.maxLayers) || 48))
    // Kiri: z = zMin + h/2; z < zMax; z += h  (zMin≈0 for heightmap)
    for (let zz = h / 2; zz < hm.zMax && levels.length < maxL; zz += h) {
      levels.push(zz)
    }
    if (!levels.length) levels.push(Math.min(h, hm.zMax * 0.5))
  } else {
    // Kiri ctSliceSingle: indices = [ ctSliceHeight ]
    levels.push(h)
  }

  const all: LaserPolyline[] = []
  const minLen = hm.scale * 2
  // Keep contours close to the photo silhouette (avoid over-simplify)
  const simpTol = hm.scale * 0.05
  for (const lv of levels) {
    if (lv > hm.zMax + 1e-6) continue
    const rings = marchingSquaresAtLevel(hm, lv)
    for (const p of rings) {
      if (p.points.length < 3) continue
      if (polyLen(p) < minLen) continue
      all.push(simplifyPoly(p, simpTol))
    }
    // Do not invent a full outer rectangle — Kiri only cuts real wall/iso edges
  }

  if (!all.length) {
    const frac = Math.max(0.05, Math.min(0.95, Number(opts.singleLevel) ?? 0.35))
    const lv = hm.zMax * frac
    const rings = marchingSquaresAtLevel(hm, lv)
    for (const p of rings) {
      if (p.points.length < 3) continue
      if (polyLen(p) < minLen) continue
      all.push(simplifyPoly(p, simpTol))
    }
  }
  if (!all.length) throw new Error('no laser contours (try blur / invert / slice height)')
  return all
}

export async function runLaserImageConvertFromFile(
  file: File,
  opts: LaserImageConvertOpts = {},
): Promise<{ polylines: LaserPolyline[]; heightmap: LaserHeightmap }> {
  const heightmap = await loadImageFileToHeightmap(file, opts)
  const polylines = heightmapToLaserPolylines(heightmap, opts)
  return { polylines, heightmap }
}
