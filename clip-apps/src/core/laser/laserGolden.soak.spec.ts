import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  LASER_DXF_GOLDEN_DEVICE_ID,
  LASER_DXF_GOLDEN_DXF,
  LASER_DXF_GOLDEN_PROCESS,
  LASER_DXF_GOLDEN_SHA256,
  LASER_SNAPMAKER_A350T_GOLDEN_DEVICE_ID,
  LASER_SNAPMAKER_A350T_SVG_GOLDEN_SHA256,
  LASER_SNAPMAKER_GOLDEN_DEVICE_ID,
  LASER_SNAPMAKER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_DEVICE_ID,
  LASER_SVG_GOLDEN_PROCESS,
  LASER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_SVG,
  laserGcodeStructuralDigest,
} from '@/core/laser/laserGoldenProfile'
import { runLaserFromDxf, runLaserFromSvg, runLaserFromPolylines } from '@/core/laser/laserEngine'
import { heightmapToLaserPolylines, type LaserHeightmap } from '@/core/laser/laserImageHeightmap'

function structuralSha(gcode: string): string {
  return createHash('sha256').update(laserGcodeStructuralDigest(gcode), 'utf8').digest('hex')
}

describe('laserGolden.soak', () => {
  it('LASER-SVG structural SHA matches pin', () => {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    expect(structuralSha(result.gcodeText)).toBe(LASER_SVG_GOLDEN_SHA256)
  })

  it('LASER-DXF structural SHA matches pin', () => {
    const result = runLaserFromDxf(LASER_DXF_GOLDEN_DXF, {
      deviceId: LASER_DXF_GOLDEN_DEVICE_ID,
      process: { ...LASER_DXF_GOLDEN_PROCESS },
    })
    expect(structuralSha(result.gcodeText)).toBe(LASER_DXF_GOLDEN_SHA256)
  })

  it('Snapmaker SVG SHA matches pin and differs from Generic', () => {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SNAPMAKER_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    const sha = structuralSha(result.gcodeText)
    expect(sha).toBe(LASER_SNAPMAKER_SVG_GOLDEN_SHA256)
    expect(sha).not.toBe(LASER_SVG_GOLDEN_SHA256)
    expect(result.gcodeText).toMatch(/\bM3\b/i)
  })

  it('Snapmaker A350T SVG SHA matches multi-vendor pin (M3)', () => {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SNAPMAKER_A350T_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    const sha = structuralSha(result.gcodeText)
    expect(sha).toBe(LASER_SNAPMAKER_A350T_SVG_GOLDEN_SHA256)
    expect(sha).not.toBe(LASER_SVG_GOLDEN_SHA256)
    expect(result.gcodeText).toMatch(/\bM3\b/i)
  })

  it('image iso contours stay packed-off and centered', () => {
    const w = 16
    const h = 16
    const z = new Float32Array(w * h)
    for (let y = 4; y < 12; y += 1) {
      for (let x = 4; x < 12; x += 1) z[y * w + x] = 2
    }
    const hm: LaserHeightmap = { width: w, height: h, z, scale: 1, widthMm: w, heightMm: h, zMax: 2 }
    const polys = heightmapToLaserPolylines(hm, { sliceMode: 'single', sliceHeightMm: 1 })
    const result = runLaserFromPolylines(polys, {
      deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
      process: { nestGap: 0, layoutPack: false, origin: 'preserve', kerf: 0, power: 1, passes: 1 },
    })
    expect(result.polylines.length).toBeGreaterThan(0)
    expect(result.gcodeText).toMatch(/G1 /)
    const xsIn = polys.flatMap((p) => p.points.map((q) => q.x))
    const xsOut = result.polylines.flatMap((p) => p.points.map((q) => q.x))
    expect(Math.min(...xsOut)).toBeCloseTo(Math.min(...xsIn), 4)
    expect(Math.max(...xsOut)).toBeCloseTo(Math.max(...xsIn), 4)
  })
})
