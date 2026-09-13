import { describe, expect, it } from 'vitest'
import {
  nestLaserClosedPolylines,
  packLaserPolylinesLayout,
  pointInLaserPoly,
} from './laserNest'
import type { LaserPolyline } from './laserSvgParse'

function square(x: number, y: number, s: number): LaserPolyline {
  return {
    closed: true,
    points: [
      { x, y },
      { x: x + s, y },
      { x: x + s, y: y + s },
      { x, y: y + s },
    ],
  }
}

describe('laserNest layout (Kiri pack)', () => {
  it('detects hole inside outer', () => {
    const outer = square(0, 0, 40)
    const hole = square(10, 10, 10)
    expect(pointInLaserPoly({ x: 15, y: 15 }, outer)).toBe(true)
    const { roots } = nestLaserClosedPolylines([outer, hole])
    expect(roots.length).toBe(1)
    expect(roots[0]!.children.length).toBe(1)
  })

  it('packs two separate shapes with spacing', () => {
    const a = square(0, 0, 10)
    const b = square(100, 100, 10)
    const packed = packLaserPolylinesLayout([a, b], 5, 300, { grouped: true, pack: true })
    expect(packed.length).toBe(2)
    const xs = packed.flatMap((p) => p.points.map((q) => q.x))
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    expect(maxX - minX).toBeLessThan(40)
    expect(minX).toBeGreaterThanOrEqual(-0.01)
  })

  it('grouped emits inners before outer', () => {
    const outer = square(0, 0, 40)
    const hole = square(10, 10, 10)
    const packed = packLaserPolylinesLayout([outer, hole], 0, 300, { grouped: true, pack: true })
    expect(packed.length).toBe(2)
    expect(packed[0]!.points[0]!.x).toBe(10)
  })
})