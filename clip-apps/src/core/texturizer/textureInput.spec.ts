import { describe, expect, it } from 'vitest'
import { resolveTextureInput } from './textureInput'

describe('resolveTextureInput', () => {
  it('uses provided texture payload directly', () => {
    const gray = new Uint8Array([1, 2, 3, 4])
    const out = resolveTextureInput({ width: 2, height: 2, gray })
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    expect(out.gray).toBe(gray)
  })

  it('builds default checker gray when texture is missing', () => {
    const out = resolveTextureInput()
    expect(out.width).toBe(128)
    expect(out.height).toBe(128)
    expect(out.gray.length).toBe(128 * 128)
    expect(out.gray[0]).toBe(64)
  })
})
