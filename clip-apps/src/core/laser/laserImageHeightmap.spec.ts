import { describe, expect, it } from 'vitest'
import {
  contoursAtLevel,
  fitLaserImageToBed,
  heightmapToLaserPolylines,
  marchingSquaresAtLevel,
  stitchContourSegments,
  type LaserHeightmap,
} from './laserImageHeightmap'
import { prepareLaserPolylines } from './laserKiriPrepare'

function makeHm(w: number, h: number, fill: (x: number, y: number) => number): LaserHeightmap {
  const z = new Float32Array(w * h)
  let zMax = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = fill(x, y)
      z[y * w + x] = v
      if (v > zMax) zMax = v
    }
  }
  return { width: w, height: h, z, scale: 1, widthMm: w, heightMm: h, zMax }
}

describe('laserImageHeightmap', () => {
  it('extracts contours from a raised square', () => {
    const hm = makeHm(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? 2 : 0))
    const polys = heightmapToLaserPolylines(hm, { sliceMode: 'single', singleLevel: 0.5 })
    expect(polys.length).toBeGreaterThan(0)
    expect(polys.some((p) => p.points.length >= 2)).toBe(true)
  })

  it('stitches adjacent segments', () => {
    const segs = [
      { closed: false, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
      { closed: false, points: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
    ]
    const out = stitchContourSegments(segs, 1e-6)
    expect(out.length).toBe(1)
    expect(out[0]!.points.length).toBeGreaterThanOrEqual(3)
  })

  it('contoursAtLevel returns empty when flat below level', () => {
    const hm = makeHm(4, 4, () => 0.1)
    expect(contoursAtLevel(hm, 1).length).toBe(0)
  })

  it('mooreContoursAtLevel returns a closed ring for a solid square', () => {
    const hm = makeHm(16, 16, (x, y) => (x >= 4 && x < 12 && y >= 4 && y < 12 ? 2 : 0))
    const rings = marchingSquaresAtLevel(hm, 1)
    expect(rings.length).toBeGreaterThanOrEqual(1)
    expect(rings[0]!.points.length).toBeGreaterThanOrEqual(4)
  })

  it('single slice uses absolute ctSliceHeight (Kiri)', () => {
    // Plateau at z=2; slice at 1 should hit walls of the plateau
    const hm = makeHm(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? 2 : 0))
    const at1 = heightmapToLaserPolylines(hm, { sliceMode: 'single', sliceHeightMm: 1 })
    const at05 = heightmapToLaserPolylines(hm, { sliceMode: 'single', sliceHeightMm: 0.5 })
    expect(at1.length).toBeGreaterThan(0)
    expect(at05.length).toBeGreaterThan(0)
  })

  it('fits image into bed like Kiri (outWidth=bedDepth)', () => {
    const fit = fitLaserImageToBed(400, 200, 300, 220)
    expect(fit.widthMm).toBeLessThanOrEqual(220 + 1e-6)
    expect(fit.heightMm).toBeLessThanOrEqual(300 + 1e-6)
    expect(fit.widthMm).toBeGreaterThan(0)
    expect(fit.heightMm / fit.widthMm).toBeCloseTo(200 / 400, 5)
  })

  it('centers iso contours and does not invent a full-frame outer wall', () => {
    const hm = makeHm(20, 20, (x, y) => (x >= 6 && x < 14 && y >= 6 && y < 14 ? 2 : 0))
    const polys = heightmapToLaserPolylines(hm, { sliceMode: 'single', sliceHeightMm: 1 })
    expect(polys.length).toBeGreaterThan(0)
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of polys) {
      for (const q of p.points) {
        if (q.x < minX) minX = q.x
        if (q.x > maxX) maxX = q.x
        if (q.y < minY) minY = q.y
        if (q.y > maxY) maxY = q.y
      }
    }
    expect(minX).toBeLessThan(0)
    expect(maxX).toBeGreaterThan(0)
    expect(minY).toBeLessThan(0)
    expect(maxY).toBeGreaterThan(0)
    expect(Math.abs((minX + maxX) / 2)).toBeLessThan(2)
    expect(Math.abs((minY + maxY) / 2)).toBeLessThan(2)
    const fakeOuter = polys.some((p) => {
      const xs = p.points.map((q) => q.x)
      const ys = p.points.map((q) => q.y)
      const spanX = Math.max(...xs) - Math.min(...xs)
      const spanY = Math.max(...ys) - Math.min(...ys)
      return Math.abs(spanX - hm.widthMm) < 0.2 && Math.abs(spanY - hm.heightMm) < 0.2
    })
    expect(fakeOuter).toBe(false)
  })

  it('layoutPack=false keeps image contour bbox in place', () => {
    const hm = makeHm(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? 2 : 0))
    const polys = heightmapToLaserPolylines(hm, { sliceMode: 'single', sliceHeightMm: 1 })
    const bbox = (ps: Array<{ points: Array<{ x: number; y: number }> }>) => {
      let minX = Infinity
      let maxX = -Infinity
      for (const p of ps) {
        for (const q of p.points) {
          if (q.x < minX) minX = q.x
          if (q.x > maxX) maxX = q.x
        }
      }
      return { minX, maxX }
    }
    const before = bbox(polys)
    const prepared = prepareLaserPolylines(polys, {
      nestGap: 0,
      layoutPack: false,
      origin: 'preserve',
      kerf: 0,
    })
    const after = bbox(prepared)
    expect(after.minX).toBeCloseTo(before.minX, 4)
    expect(after.maxX).toBeCloseTo(before.maxX, 4)
  })
})