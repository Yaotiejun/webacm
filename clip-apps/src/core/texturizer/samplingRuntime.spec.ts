import { describe, expect, it, vi } from 'vitest'
import { buildSamplingRuntime } from './samplingRuntime'

describe('buildSamplingRuntime', () => {
  it('builds sample/cached/compute adapters', () => {
    const legacy = vi.fn(() => ({ u: 0.2, v: 0.3 }))
    const rt = buildSamplingRuntime({
      imgW: 2,
      imgH: 2,
      imgGray: new Uint8Array([0, 255, 255, 0]),
      computeUvLegacy: legacy,
    })
    const s = rt.sampleGray(0.5, 0.5)
    expect(s).toBeGreaterThanOrEqual(0)
    expect(s).toBeLessThanOrEqual(1)

    const a = rt.getCachedGray('k', () => 0.4)
    const b = rt.getCachedGray('k', () => 0.9)
    expect(a).toBe(0.4)
    expect(b).toBe(0.4)

    const uv = rt.computeUV({ x: 1, y: 2, z: 3 }, { x: 0, y: 0, z: 1 }, 6, {}, {})
    expect(legacy).toHaveBeenCalled()
    expect(uv).toEqual({ u: 0.2, v: 0.3 })
  })
})
