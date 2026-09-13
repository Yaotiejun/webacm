import { describe, expect, it } from 'vitest'
import { parseSimpleSvgPath, parseSvgTextFallback, parseSvgToLaserPolylines, laserSampleSquare } from '@/core/laser/laserSvgParse'
import { buildLaserGcodeFromPolylines, applyKerfOffset } from '@/core/laser/laserGcode'
import { runLaserFromSvg } from '@/core/laser/laserEngine'
import {
  LASER_SVG_GOLDEN_DEVICE_ID,
  LASER_SVG_GOLDEN_PROCESS,
  LASER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_SVG,
  laserGcodeStructuralDigest,
} from '@/core/laser/laserGoldenProfile'
import { createHash } from 'node:crypto'
import { countBundledLaserDevices, getStockLaserDevice } from '@/core/laser/stock/stockLaserDevices'

describe('laserSvgParse', () => {
  it('parses simple path M/L/Z', () => {
    const polys = parseSimpleSvgPath('M0 0 L10 0 L10 10 Z')
    expect(polys).toHaveLength(1)
    expect(polys[0]!.closed).toBe(true)
    expect(polys[0]!.points).toHaveLength(3)
  })

  it('flattens cubic and arc path commands', () => {
    const cubic = parseSimpleSvgPath('M0 0 C5 0 5 10 0 10')
    expect(cubic[0]!.points.length).toBeGreaterThan(4)
    const arc = parseSimpleSvgPath('M10 0 A10 10 0 0 1 0 10')
    expect(arc[0]!.points.length).toBeGreaterThan(4)
  })

  it('parses rect via fallback', () => {
    const polys = parseSvgTextFallback('<svg><rect x="1" y="2" width="30" height="20"/></svg>')
    expect(polys).toHaveLength(1)
    expect(polys[0]!.points[0]).toEqual({ x: 1, y: 2 })
  })

  it('applies transform and Y-flip on import', () => {
    const polys = parseSvgToLaserPolylines(
      '<svg><g transform="translate(10,0)"><rect x="0" y="0" width="20" height="10"/></g></svg>',
    )
    expect(polys).toHaveLength(1)
    const xs = polys[0]!.points.map((p) => p.x)
    expect(Math.min(...xs)).toBeCloseTo(10, 5)
    expect(Math.max(...xs)).toBeCloseTo(30, 5)
    const ys = polys[0]!.points.map((p) => p.y)
    expect(Math.min(...ys)).toBeCloseTo(0, 5)
  })
})

describe('laserGcode', () => {
  it('emits laser on/off and closed path', () => {
    const gcode = buildLaserGcodeFromPolylines(laserSampleSquare(20, 0), { feedrate: 800, power: 0.5 })
    expect(gcode).toContain('M106 S127.500')
    expect(gcode).toContain('M107')
    expect(gcode).toContain('G1 X20.000 Y0.000')
    expect(gcode).toMatch(/G1 X0\.000 Y0\.000/)
  })

  it('applies kerf offset', () => {
    const sq = laserSampleSquare(10, 0)[0]!
    const off = applyKerfOffset(sq, 2)
    expect(off.points[0]!.x).not.toBe(0)
  })
})

describe('laserEngine + stock', () => {
  it('bundles laser devices', () => {
    expect(countBundledLaserDevices()).toBeGreaterThanOrEqual(4)
    expect(getStockLaserDevice('Any.Generic.Laser')?.bedWidth).toBe(300)
  })

  it('runs SVG sample to gcode', () => {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    expect(result.polylines.length).toBe(1)
    expect(result.gcodeText.length).toBeGreaterThan(40)
    expect(result.backend).toBe('kiri-ts')
    const digest = laserGcodeStructuralDigest(result.gcodeText)
    expect(createHash('sha256').update(digest, 'utf8').digest('hex')).toBe(LASER_SVG_GOLDEN_SHA256)
  })
})
