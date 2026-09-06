import { describe, expect, it } from 'vitest'
import { centerFromRadius, tessellateGcodeArc, thetaDiff } from './gcodeArcTessellate'

describe('gcodeArcTessellate', () => {
  it('thetaDiff returns negative sweep for clockwise quarter turn', () => {
    const ad = thetaDiff(Math.PI / 2, 0, true)
    expect(ad).toBeLessThan(0)
    expect(Math.abs(ad)).toBeCloseTo(Math.PI / 2, 3)
  })

  it('tessellates quarter circle with I/J (G3 CCW)', () => {
    const r = tessellateGcodeArc({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 1, z: 0 },
      clockwise: false,
      i: 1,
      j: 0,
      arcmotionDivsPerPi: 12,
    })
    expect(r).not.toBeNull()
    expect(r!.points.length).toBeGreaterThan(2)
    for (const p of r!.points) {
      expect(Math.hypot(p.x - 1, p.y)).toBeCloseTo(1, 2)
    }
  })

  it('tessellates with R format', () => {
    const r = tessellateGcodeArc({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 2, y: 0, z: 0 },
      clockwise: false,
      r: 1,
      arcmotionDivsPerPi: 16,
    })
    expect(r).not.toBeNull()
    expect(r!.points.length).toBeGreaterThan(3)
  })

  it('interpolates Z along helical arc', () => {
    const r = tessellateGcodeArc({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 2 },
      clockwise: true,
      i: 0.5,
      j: 0,
      arcmotionDivsPerPi: 8,
    })
    expect(r).not.toBeNull()
    const mid = r!.points[Math.floor(r!.points.length / 2)]!
    expect(mid.z).toBeGreaterThan(0)
    expect(mid.z).toBeLessThan(2)
  })

  it('tessellates G18 XZ plane arc with I/K', () => {
    const r = tessellateGcodeArc({
      start: { x: 0, y: 0, z: 0 },
      end: { x: 1, y: 0, z: 1 },
      clockwise: false,
      plane: 'xz',
      i: 0.5,
      k: 0,
      arcmotionDivsPerPi: 12,
    })
    expect(r).not.toBeNull()
    for (const p of r!.points) {
      expect(Math.hypot(p.x - 0.5, p.z)).toBeCloseTo(0.5, 2)
    }
  })

  it('returns null without I/J/R', () => {
    expect(
      tessellateGcodeArc({
        start: { x: 0, y: 0, z: 0 },
        end: { x: 1, y: 1, z: 0 },
        clockwise: true,
      }),
    ).toBeNull()
  })

  it('centerFromRadius picks consistent side for CW', () => {
    const c = centerFromRadius({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.5, true)
    expect(c.x).toBeCloseTo(0.5, 5)
    expect(c.y).toBeCloseTo(0, 5)
  })
})
