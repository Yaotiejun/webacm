import { describe, expect, it } from 'vitest'
import { resolveCubicUv } from './cubicUv'

const base = {
  scaleU: 1,
  scaleV: 1,
  offsetU: 0,
  offsetV: 0,
  textureAspectU: 1,
  textureAspectV: 1,
}

describe('resolveCubicUv', () => {
  it('wraps output UV into [0,1)', () => {
    const uv = resolveCubicUv(1.25, -0.25, base, 0)
    expect(uv.u).toBeCloseTo(0.25, 8)
    expect(uv.v).toBeCloseTo(0.75, 8)
  })

  it('applies aspect and scale before wrapping', () => {
    const uv = resolveCubicUv(0.5, 0.5, { ...base, textureAspectU: 2, textureAspectV: 3, scaleU: 2, scaleV: 3 }, 0)
    expect(uv.u).toBeCloseTo(0.5, 8)
    expect(uv.v).toBeCloseTo(0.5, 8)
  })

  it('rotates around UV center', () => {
    const uv = resolveCubicUv(0.75, 0.5, base, Math.PI / 2)
    expect(uv.u).toBeCloseTo(0.5, 8)
    expect(uv.v).toBeCloseTo(0.75, 8)
  })
})
