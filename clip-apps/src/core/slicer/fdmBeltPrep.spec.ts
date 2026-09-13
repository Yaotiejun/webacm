import { describe, expect, it } from 'vitest'
import { applyBeltPointRotation, buildBeltMeta } from './fdmBeltPrep'
import { attachBeltPrepToWidget } from './kiriLegacyBridge'

describe('fdmBeltPrep', () => {
  it('rotates points about X by sliceAngle', () => {
    const p = { x: 0, y: 10, z: 0 }
    applyBeltPointRotation([p], 90)
    expect(p.x).toBe(0)
    expect(p.y).toBeCloseTo(0, 5)
    expect(p.z).toBeCloseTo(10, 5)
  })

  it('buildBeltMeta returns null unless bedBelt', () => {
    expect(
      buildBeltMeta({
        process: { sliceAngle: 45 },
        device: { bedBelt: false, bedDepth: 300 },
        minY: -5,
        maxY: 20,
      }),
    ).toBeNull()
  })

  it('buildBeltMeta attaches angle/trig for CR-30 style', () => {
    const meta = buildBeltMeta({
      process: { sliceAngle: 45, beltAnchor: 2 },
      device: { bedBelt: true, bedDepth: 350 },
      minY: -10,
      maxY: 40,
      trackPosY: 0,
    })
    expect(meta).not.toBeNull()
    expect(meta!.angle).toBe(45)
    expect(meta!.dy).toBeCloseTo(8, 5) // -minY - yoff = 10 - 2
    expect(meta!.cosf).toBeCloseTo(Math.cos(Math.PI / 4), 5)
    expect(meta!.sinf).toBeCloseTo(Math.sin(Math.PI / 4), 5)
  })
})

describe('attachBeltPrepToWidget', () => {
  it('skips when device is not belt', () => {
    const pts = [{ x: 0, y: 5, z: 1 }]
    const widget = {
      belt: undefined as unknown,
      track: { pos: { y: 0 } },
      getPoints: () => pts,
    }
    attachBeltPrepToWidget({
      widget,
      settings: { device: { bedBelt: false }, process: { sliceAngle: 45 } },
      vb: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 5, maxZ: 1 },
    })
    expect(widget.belt).toBeUndefined()
    expect(pts[0]!.y).toBe(5)
  })

  it('rotates points and attaches belt meta when bedBelt', () => {
    const pts = [{ x: 0, y: 10, z: 0 }]
    const widget = {
      belt: undefined as unknown,
      track: { pos: { y: 0 } },
      getPoints: () => pts,
    }
    attachBeltPrepToWidget({
      widget,
      settings: {
        device: { bedBelt: true, bedDepth: 350 },
        process: { sliceAngle: 90, beltAnchor: 0 },
      },
      vb: { minX: 0, minY: 10, minZ: 0, maxX: 1, maxY: 10, maxZ: 1 },
    })
    expect(widget.belt).toMatchObject({ angle: 90 })
    // after shift by -minY (y→0) then 90° about X: (0,0,0) stays
    expect(pts[0]!.y).toBeCloseTo(0, 5)
    expect(pts[0]!.z).toBeCloseTo(0, 5)
  })
})
