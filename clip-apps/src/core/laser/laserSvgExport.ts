/**
 * Kiri-like flat SVG export from LaserPolyline[] (ctOutStack=false mode).
 */
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserSvgExportOpts = {
  unit?: 'mm' | 'in'
  stroke?: string
  strokeWidth?: string
}

const R = (n: number) => Math.round(n * 1000) / 1000

export function exportLaserPolylinesToSvg(
  polys: LaserPolyline[],
  opts: LaserSvgExportOpts = {},
): string {
  const unit = opts.unit ?? 'mm'
  const scale = unit === 'in' ? 1 / 25.4 : 1
  const stroke = opts.stroke ?? 'black'
  const sw = opts.strokeWidth ?? '0.1mm'
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const poly of polys) {
    for (const pt of poly.points) {
      if (pt.x < minX) minX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.x > maxX) maxX = pt.x
      if (pt.y > maxY) maxY = pt.y
    }
  }
  if (!Number.isFinite(minX)) {
    return '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>\n'
  }
  const w = R((maxX - minX) * scale)
  const h = R((maxY - minY) * scale)
  const lines: string[] = [
    '<?xml version="1.0" standalone="no"?>',
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}${unit}" height="${h}${unit}" viewBox="0 0 ${w} ${h}" version="1.1">`,
  ]
  for (const poly of polys) {
    if (poly.points.length < 2) continue
    const pts = poly.points
      .map((pt) => {
        const x = R((pt.x - minX) * scale)
        const y = R((maxY - pt.y) * scale)
        return `${x},${y}`
      })
      .join(' ')
    lines.push(`<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${sw}" />`)
  }
  lines.push('</svg>')
  return `${lines.join('\n')}\n`
}
