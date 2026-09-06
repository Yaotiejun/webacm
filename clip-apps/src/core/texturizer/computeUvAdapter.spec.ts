import { describe, expect, it, vi } from 'vitest'
import { makeComputeUvAdapter } from './computeUvAdapter'

describe('makeComputeUvAdapter', () => {
  it('forwards args to legacy computeUV and returns result', () => {
    const legacy = vi.fn(() => ({ u: 0.1, v: 0.2 }))
    const adapter = makeComputeUvAdapter(legacy)
    const p = { x: 1, y: 2, z: 3 }
    const n = { x: 0, y: 0, z: 1 }
    const st = { k: 1 }
    const bd = { b: 2 }
    const out = adapter(p, n, 6, st, bd)
    expect(legacy).toHaveBeenCalledWith(p, n, 6, st, bd)
    expect(out).toEqual({ u: 0.1, v: 0.2 })
  })
})
