import { describe, expect, it } from 'vitest'
import { sampleGrayBilinear } from './textureSampling'

function tex2x2() {
  return {
    width: 2,
    height: 2,
    // row-major: top-left, top-right, bottom-left, bottom-right
    gray: new Uint8Array([
      0, 255,
      64, 128,
    ]),
  }
}

describe('sampleGrayBilinear', () => {
  it('applies bilinear interpolation at texture center', () => {
    const out = sampleGrayBilinear(tex2x2(), 0.5, 0.5)
    expect(out).toBeCloseTo((0 + 1 + (64 / 255) + (128 / 255)) / 4, 8)
  })

  it('wraps uv outside [0,1)', () => {
    const outA = sampleGrayBilinear(tex2x2(), 1.2, -0.8)
    const outB = sampleGrayBilinear(tex2x2(), 0.2, 0.2)
    expect(outA).toBeCloseTo(outB, 8)
  })

  it('flips v axis to match legacy sampling orientation', () => {
    const top = sampleGrayBilinear(tex2x2(), 0, 0.999)
    const bottom = sampleGrayBilinear(tex2x2(), 0, 0.001)
    expect(top).toBeLessThan(0.001)
    expect(bottom).toBeGreaterThan((64 / 255) - 0.001)
  })
})
