/**
 * Pinned Laser SVG / DXF / vendor-device golden profiles (LASER-* soak).
 */
import { createHash } from 'node:crypto'
import { runLaserFromDxf, runLaserFromSvg } from '@/core/laser/laserEngine'

export const LASER_SVG_GOLDEN_SVG = '<svg><rect x="5" y="5" width="40" height="30"/></svg>'

export const LASER_SVG_GOLDEN_PROCESS = {
  power: 1,
  passes: 1,
  feedrate: 1000,
  seekrate: 3000,
  kerf: 0,
} as const

export const LASER_SVG_GOLDEN_DEVICE_ID = 'Any.Generic.Laser'

/** Vendor device with distinct M3/M5 macros (≠ Generic M106/M107). */
export const LASER_SNAPMAKER_GOLDEN_DEVICE_ID = 'Snapmaker.A250T'

/** Second Snapmaker vendor pin (same M3 macros; multi-vendor soak). */
export const LASER_SNAPMAKER_A350T_GOLDEN_DEVICE_ID = 'Snapmaker.A350T'

/** Minimal ASCII DXF square (4 LINE entities) — LASER-DXF soak. */
export const LASER_DXF_GOLDEN_DXF = `0
SECTION
2
ENTITIES
0
LINE
10
0
20
0
11
10
21
0
0
LINE
10
10
20
0
11
10
21
10
0
LINE
10
10
20
10
11
0
21
10
0
LINE
10
0
20
10
11
0
21
0
0
ENDSEC
0
EOF
`

export const LASER_DXF_GOLDEN_PROCESS = {
  power: 1,
  passes: 1,
  feedrate: 1000,
  seekrate: 3000,
  kerf: 0,
  nestGap: 0,
} as const

export const LASER_DXF_GOLDEN_DEVICE_ID = 'Any.Generic.Laser'

/** Normalize G-code for structural golden: strip ;comments, keep motion/laser lines. */
export function laserGcodeStructuralDigest(gcode: string): string {
  const keep = /^(G0|G1|G21|G90|M3|M5|M106|M107|M30)\b/i
  const lines: string[] = []
  for (const raw of gcode.split(/\r?\n/)) {
    const line = raw.replace(/;.*$/, '').replace(/\s+/g, ' ').trim()
    if (!line) continue
    if (!keep.test(line)) continue
    lines.push(line)
  }
  return lines.join('\n')
}

export function hashLaserGcodeStructural(gcode: string): string {
  return createHash('sha256').update(laserGcodeStructuralDigest(gcode), 'utf8').digest('hex')
}

export function computeLaserSvgGoldenSha256(): string {
  const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
    deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
    process: { ...LASER_SVG_GOLDEN_PROCESS },
  })
  return hashLaserGcodeStructural(result.gcodeText)
}

export function computeLaserSnapmakerSvgGoldenSha256(): string {
  const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
    deviceId: LASER_SNAPMAKER_GOLDEN_DEVICE_ID,
    process: { ...LASER_SVG_GOLDEN_PROCESS },
  })
  return hashLaserGcodeStructural(result.gcodeText)
}

export function computeLaserSnapmakerA350TSvgGoldenSha256(): string {
  const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
    deviceId: LASER_SNAPMAKER_A350T_GOLDEN_DEVICE_ID,
    process: { ...LASER_SVG_GOLDEN_PROCESS },
  })
  return hashLaserGcodeStructural(result.gcodeText)
}

export function computeLaserDxfGoldenSha256(): string {
  const result = runLaserFromDxf(LASER_DXF_GOLDEN_DXF, {
    deviceId: LASER_DXF_GOLDEN_DEVICE_ID,
    process: { ...LASER_DXF_GOLDEN_PROCESS },
  })
  return hashLaserGcodeStructural(result.gcodeText)
}

/** Pinned SHA-256 of laserGcodeStructuralDigest(runLaserFromSvg(...).gcodeText). */
export const LASER_SVG_GOLDEN_SHA256 = '72df81c942c36380890ca73485a4bb0e8dc43d828cd93e330e9602ea5f6ac144'

/** Structural SVG-export digest (LASER-SVG-EXPORT soak) — same fixture as LASER-SVG. */
export const LASER_SVG_EXPORT_GOLDEN_SHA256 =
  'e97929b47e4445a80190a82114f7fc4a5544b8afe4f9216b983732d21d72efac'

/** Pinned SHA-256 of laserGcodeStructuralDigest(runLaserFromDxf(...).gcodeText). */
export const LASER_DXF_GOLDEN_SHA256 = 'cb005326a4f091859ba7d8797ed7388bc5cbfc981fb6d0cda1ff70c9bef5a096'
/** Pinned SHA-256 of laserGcodeStructuralDigest(runLaserFromSvg Snapmaker...).gcodeText) */
export const LASER_SNAPMAKER_SVG_GOLDEN_SHA256 = 'b322b9594b7862735a6bec3e7140d89bbb0d12adea16bcbe8cf8e571e71d91b2'
/** A350T mirrors A250T macros → same structural SHA (multi-vendor pin). */
export const LASER_SNAPMAKER_A350T_SVG_GOLDEN_SHA256 = LASER_SNAPMAKER_SVG_GOLDEN_SHA256
