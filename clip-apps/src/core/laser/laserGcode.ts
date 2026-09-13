/**
 * TypeScript port of Kiri LASER.exportGCode (2D cut path).
 * Macros: gcodeLaserOn/Off with {power}; pre/post; multi-pass.
 */
import type { LaserPreparedPoly } from '@/core/laser/laserKiriPrepare'
import { applyKerfLikeKiri } from '@/core/laser/laserKiriPrepare'

export type LaserGcodeProcess = {
  feedrate?: number
  seekrate?: number
  /** 0..1 → {power} = laserMaxPower * power */
  power?: number
  passes?: number
}

export type LaserGcodeDevice = {
  laserOn?: string[]
  laserOff?: string[]
  pre?: string[]
  post?: string[]
  bedWidth?: number
  bedDepth?: number
  tokenSpace?: string
  laserMaxPower?: number
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toFixed(3)
}

function xy(space: string, p: { x: number; y: number }): string {
  return `X${fmt(p.x)}${space}Y${fmt(p.y)}`
}

function expandPower(template: string, powerValue: string): string {
  return template
    .replace(/\{power\}/gi, powerValue)
    .replace(/\{color\}/gi, '1')
    .replace(/\{thick\}/gi, '1')
    .replace(/\{z\}/gi, '0')
}

/** Emit G-code matching Kiri exportGCode structure for laser mode. */
export function buildLaserGcodeFromPrepared(
  polys: LaserPreparedPoly[],
  process: LaserGcodeProcess = {},
  device: LaserGcodeDevice = {},
): string {
  const feed = Math.max(1, Number(process.feedrate) || 1000)
  const power01 = Math.max(0, Math.min(1, Number(process.power) ?? 1))
  const passes = Math.max(1, Math.floor(Number(process.passes) || 1))
  const space = device.tokenSpace != null ? device.tokenSpace : ' '
  const maxPower = Number(device.laserMaxPower) || 255
  const powerValue = (maxPower * power01).toFixed(3)
  const laserOn = device.laserOn?.length ? device.laserOn : ['M106 S{power}']
  const laserOff = device.laserOff?.length ? device.laserOff : ['M107']
  const pre = device.pre?.length
    ? device.pre
    : ['G21 ; set units to MM (required)', 'G90 ; absolute position mode (required)']
  const post = device.post?.length ? device.post : ['M30 ; program end']

  const lines: string[] = []
  lines.push('; shapexcam laser gcode (kiri-ts)')
  lines.push(`; polys=${polys.length} passes=${passes} power=${powerValue}`)

  for (const p of pre) lines.push(p)

  const feedrate = `${space}F${feed}`

  for (let pass = 0; pass < passes; pass += 1) {
    if (passes > 1) lines.push(`; pass ${pass + 1}/${passes}`)
    for (const poly of polys) {
      if (poly.points.length < 2) continue
      const pts = [...poly.points]
      if (poly.closed) {
        const first = pts[0]!
        const last = pts[pts.length - 1]!
        if (Math.hypot(first.x - last.x, first.y - last.y) > 1e-6) {
          pts.push({ x: first.x, y: first.y })
        }
      }
      lines.push(`G0${space}${xy(space, pts[0]!)}`)
      for (const on of laserOn) lines.push(expandPower(on, powerValue))
      for (let i = 1; i < pts.length; i += 1) {
        if (i === 1) lines.push(`G1${space}${xy(space, pts[i]!)}${feedrate}`)
        else lines.push(`G1${space}${xy(space, pts[i]!)}`)
      }
      for (const off of laserOff) lines.push(off)
    }
  }

  for (const p of post) lines.push(p)
  return `${lines.join('\n')}\n`
}

/** Compatibility wrapper. */
export function buildLaserGcodeFromPolylines(
  polys: Array<{ closed: boolean; points: Array<{ x: number; y: number }> }>,
  process: LaserGcodeProcess = {},
  device: LaserGcodeDevice = {},
): string {
  return buildLaserGcodeFromPrepared(polys, process, device)
}

/** Legacy helper used by older specs — half-kerf vertex offset. */
export function applyKerfOffset(
  poly: { closed: boolean; points: Array<{ x: number; y: number }> },
  kerfMm: number,
): { closed: boolean; points: Array<{ x: number; y: number }> } {
  return applyKerfLikeKiri(poly, kerfMm / 2)
}