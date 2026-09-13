/**
 * PNG/JPG/WebP → grayscale → horizontal scanline polylines (Kiri-like raster engrave).
 * Threshold mode; zigzag row direction; optional downsample for large images.
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserBitmapGray = {
  width: number
  height: number
  gray: Uint8Array
}

export type LaserBitmapEngraveOpts = {
  /** Engrave width in mm (height follows aspect). Default 80. */
  widthMm?: number
  /** 0..255 — darker than this burns (default 128). */
  threshold?: number
  /** Invert luminance (photo negative). */
  invert?: boolean
  /** Skip every N-1 rows for speed (default 1 = all rows). */
  rowStep?: number
  /** Min run length in pixels to emit a segment (default 1). */
  minRunPx?: number
  /** Max image width in px before downsample (default 1200). */
  maxWidthPx?: number
}

export async function loadImageFileToGray(file: File): Promise<LaserBitmapGray> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    return imageElementToGray(img)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

export function imageElementToGray(
  img: HTMLImageElement,
  maxWidthPx = 1200,
): LaserBitmapGray {
  const srcW = Math.max(1, img.naturalWidth || img.width)
  const srcH = Math.max(1, img.naturalHeight || img.height)
  const scaleDown = srcW > maxWidthPx ? maxWidthPx / srcW : 1
  const width = Math.max(1, Math.round(srcW * scaleDown))
  const height = Math.max(1, Math.round(srcH * scaleDown))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas 2d unavailable')
  ctx.drawImage(img, 0, 0, width, height)
  const data = ctx.getImageData(0, 0, width, height)
  const gray = new Uint8Array(width * height)
  for (let i = 0, j = 0; i < data.data.length; i += 4, j += 1) {
    const r = data.data[i] ?? 0
    const g = data.data[i + 1] ?? 0
    const b = data.data[i + 2] ?? 0
    const a = data.data[i + 3] ?? 255
    // Transparent → white (no burn)
    if (a < 16) {
      gray[j] = 255
      continue
    }
    gray[j] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }
  return { width, height, gray }
}

/**
 * Horizontal burn segments. Zigzag alternate rows (Kiri-like raster travel).
 * Origin bottom-left (Y up) to match laser bed / SVG import.
 */
export function grayToLaserEngravePolylines(
  bmp: LaserBitmapGray,
  opts: LaserBitmapEngraveOpts = {},
): LaserPolyline[] {
  const widthMm = Math.max(1, Number(opts.widthMm) || 80)
  const threshold = Math.max(0, Math.min(255, Number(opts.threshold) ?? 128))
  const invert = Boolean(opts.invert)
  const rowStep = Math.max(1, Math.floor(Number(opts.rowStep) || 1))
  const minRunPx = Math.max(1, Math.floor(Number(opts.minRunPx) || 1))
  const { width, height, gray } = bmp
  if (!width || !height || gray.length < width * height) {
    throw new Error('invalid grayscale bitmap')
  }
  const scale = widthMm / width
  const heightMm = height * scale
  const polys: LaserPolyline[] = []
  const isDark = (v: number) => (invert ? v > threshold : v < threshold)

  let rowIndex = 0
  for (let y = 0; y < height; y += rowStep) {
    const runs: Array<{ x0: number; x1: number }> = []
    let runStart = -1
    for (let x = 0; x <= width; x += 1) {
      const inside = x < width && isDark(gray[y * width + x]!)
      if (inside && runStart < 0) runStart = x
      if (!inside && runStart >= 0) {
        if (x - runStart >= minRunPx) runs.push({ x0: runStart, x1: x })
        runStart = -1
      }
    }
    if (!runs.length) continue
    const yy = heightMm - (y + 0.5) * scale
    const rtl = rowIndex % 2 === 1
    const ordered = rtl ? [...runs].reverse() : runs
    for (const run of ordered) {
      const x0 = run.x0 * scale
      const x1 = run.x1 * scale
      polys.push({
        closed: false,
        points: rtl
          ? [
              { x: x1, y: yy },
              { x: x0, y: yy },
            ]
          : [
              { x: x0, y: yy },
              { x: x1, y: yy },
            ],
      })
    }
    rowIndex += 1
  }

  if (!polys.length) {
    throw new Error('no burnable pixels (try threshold / invert)')
  }
  return polys
}

export async function runLaserEngraveFromImageFile(
  file: File,
  opts: LaserBitmapEngraveOpts = {},
): Promise<{ polylines: LaserPolyline[]; gray: LaserBitmapGray }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    const gray = imageElementToGray(img, opts.maxWidthPx ?? 1200)
    const polylines = grayToLaserEngravePolylines(gray, opts)
    return { polylines, gray }
  } finally {
    URL.revokeObjectURL(url)
  }
}