import { describe, expect, it } from 'vitest'
import { resolveTextureAspectCorrection } from './textureAspect'

describe('resolveTextureAspectCorrection', () => {
  it('returns 1:1 for square textures', () => {
    const out = resolveTextureAspectCorrection(512, 512)
    expect(out.textureAspectU).toBe(1)
    expect(out.textureAspectV).toBe(1)
  })

  it('increases V aspect for wide textures', () => {
    const out = resolveTextureAspectCorrection(1024, 256)
    expect(out.textureAspectU).toBe(1)
    expect(out.textureAspectV).toBe(4)
  })

  it('increases U aspect for tall textures', () => {
    const out = resolveTextureAspectCorrection(300, 900)
    expect(out.textureAspectU).toBe(3)
    expect(out.textureAspectV).toBe(1)
  })

  it('clamps invalid dimensions to safe defaults', () => {
    const out = resolveTextureAspectCorrection(0, Number.NaN)
    expect(out.textureAspectU).toBe(1)
    expect(out.textureAspectV).toBe(1)
  })
})
