import { describe, expect, it } from 'vitest'
import { grayToLaserEngravePolylines, type LaserBitmapGray } from './laserBitmapEngrave'

function makeGray(w: number, h: number, fill: number): LaserBitmapGray {
  return { width: w, height: h, gray: new Uint8Array(w * h).fill(fill) }
}

describe('laserBitmapEngrave', () => {
  it('emits horizontal segments for dark runs', () => {
    const bmp = makeGray(10, 4, 255)
    // dark bar on row 1, x=2..7
    for (let x = 2; x < 8; x++) bmp.gray[1 * 10 + x] = 0
    const polys = grayToLaserEngravePolylines(bmp, { widthMm: 10, threshold: 128 })
    expect(polys.length).toBeGreaterThanOrEqual(1)
    const p = polys[0]!
    expect(p.points).toHaveLength(2)
    expect(p.points[0]!.x).toBeCloseTo(2, 5)
    expect(p.points[1]!.x).toBeCloseTo(8, 5)
  })

  it('throws when nothing to burn', () => {
    const bmp = makeGray(4, 4, 255)
    expect(() => grayToLaserEngravePolylines(bmp, { threshold: 10 })).toThrow(/no burnable/)
  })
})
