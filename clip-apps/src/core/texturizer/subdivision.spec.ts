import { describe, expect, it } from 'vitest'
import { subdivideTrianglesAdaptive } from './subdivision'

function buildGridTriangles(nx: number, ny: number): Float32Array {
  const out: number[] = []
  for (let y = 0; y < ny - 1; y += 1) {
    for (let x = 0; x < nx - 1; x += 1) {
      const x0 = x
      const y0 = y
      const x1 = x + 1
      const y1 = y + 1
      out.push(
        x0, y0, 0,
        x1, y0, 0,
        x1, y1, 0,
        x0, y0, 0,
        x1, y1, 0,
        x0, y1, 0,
      )
    }
  }
  return new Float32Array(out)
}

describe('subdivideTrianglesAdaptive', () => {
  it('returns original vertices when levels is zero', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = subdivideTrianglesAdaptive(src, 0)
    expect(out.safetyCapHit).toBe(false)
    expect(Array.from(out.vertices)).toEqual(Array.from(src))
    expect(out.triExcludedOut.length).toBe(1)
    expect(out.triExcludedOut[0]).toBe(0)
  })

  it('passes through triExcludedOut when levels is zero and mask provided', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = subdivideTrianglesAdaptive(src, 0, undefined, { triExcluded: new Uint8Array([1]) })
    expect(out.triExcludedOut.length).toBe(1)
    expect(out.triExcludedOut[0]).toBe(1)
  })

  it('splits long-edge triangle when subdivision is enabled', () => {
    const src = new Float32Array([
      0, 0, 0,
      10, 0, 0,
      0, 10, 0,
    ])
    const out = subdivideTrianglesAdaptive(src, 1)
    expect(out.safetyCapHit).toBe(false)
    expect(out.vertices.length).toBeGreaterThan(src.length)
    expect(out.vertices.length % 9).toBe(0)
  })

  it('keeps winding-compatible triangle packing', () => {
    const src = new Float32Array([
      0, 0, 0,
      10, 0, 0,
      10, 10, 0,
      0, 0, 0,
      10, 10, 0,
      0, 10, 0,
    ])
    const out = subdivideTrianglesAdaptive(src, 1)
    expect(out.vertices.length % 9).toBe(0)
    expect(out.vertices.length).toBeGreaterThan(src.length)
  })

  it('does not refine excluded regions when no neighbor marks their edges', () => {
    const mesh = buildGridTriangles(8, 8)
    const triBefore = Math.floor(mesh.length / 9)
    const allExcluded = new Uint8Array(triBefore).fill(1)
    const out = subdivideTrianglesAdaptive(mesh, 2, undefined, { triExcluded: allExcluded })
    expect(out.safetyCapHit).toBe(false)
    expect(out.vertices.length).toBe(mesh.length)
  })

  it('subdivides more when no faces are excluded than when all are excluded (same mesh)', () => {
    const mesh = buildGridTriangles(8, 8)
    const triBefore = Math.floor(mesh.length / 9)
    const allExcluded = new Uint8Array(triBefore).fill(1)
    const withEx = subdivideTrianglesAdaptive(mesh, 2, undefined, { triExcluded: allExcluded })
    const noEx = subdivideTrianglesAdaptive(mesh, 2)
    expect(noEx.vertices.length).toBeGreaterThan(withEx.vertices.length)
  })

  it('triExcludedOut matches output triangle count after subdivision', () => {
    const mesh = buildGridTriangles(6, 6)
    const triBefore = Math.floor(mesh.length / 9)
    const mask = new Uint8Array(triBefore)
    mask[0] = 1
    const out = subdivideTrianglesAdaptive(mesh, 1, undefined, { triExcluded: mask })
    const triAfter = Math.floor(out.vertices.length / 9)
    expect(out.triExcludedOut.length).toBe(triAfter)
  })

  it('emits monotonic subdivision progress on a multi-triangle mesh', () => {
    const mesh = buildGridTriangles(24, 24)
    const progress: number[] = []
    subdivideTrianglesAdaptive(mesh, 2, (p) => {
      progress.push(p)
    })
    expect(progress.length).toBeGreaterThan(4)
    for (let i = 1; i < progress.length; i += 1) {
      expect((progress[i] ?? 0) + 1e-9).toBeGreaterThanOrEqual(progress[i - 1] ?? 0)
    }
    expect(progress[progress.length - 1]).toBe(1)
  })
})
