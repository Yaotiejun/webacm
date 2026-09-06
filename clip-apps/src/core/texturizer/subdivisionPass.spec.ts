import { describe, expect, it } from 'vitest'
import { runSubdivisionPass } from './subdivisionPass'

describe('runSubdivisionPass', () => {
  it('returns passthrough result when levels <= 0', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const triExcluded = new Uint8Array([1])
    const out = runSubdivisionPass({
      vertices,
      levels: 0,
      triExcluded,
    })
    expect(out.vertices).toBe(vertices)
    expect(out.triExcluded).toBe(triExcluded)
    expect(out.safetyCapHit).toBe(false)
    expect(out.elapsedMs).toBe(0)
  })

  it('runs adaptive subdivision and keeps exclusion output aligned', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      2, 0, 0,
      0, 2, 0,
    ])
    const out = runSubdivisionPass({
      vertices,
      levels: 1,
      triExcluded: new Uint8Array([0]),
    })
    expect(out.vertices.length).toBeGreaterThan(0)
    expect(out.triExcluded.length).toBe(Math.floor(out.vertices.length / 9))
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0)
  })
})
