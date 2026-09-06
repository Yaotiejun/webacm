import { describe, expect, it } from 'vitest'
import { runDecimationPass } from './decimationPass'

describe('runDecimationPass', () => {
  it('returns decimated vertices with elapsed timing', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
      1, 0, 1,
      0, 1, 1,
    ])
    const seen: number[] = []
    const out = runDecimationPass({
      vertices,
      decimationRatio: 0.8,
      onProgress: (p) => seen.push(p),
    })
    expect(out.vertices.length).toBeGreaterThan(0)
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(out.engine).toBeDefined()
    if (seen.length > 0) {
      for (let i = 0; i < seen.length; i += 1) {
        expect((seen[i] ?? 0) >= 0).toBe(true)
        expect((seen[i] ?? 0) <= 1).toBe(true)
      }
      expect((seen[seen.length - 1] ?? 0) >= 0.02).toBe(true)
    }
  })
})
