import { describe, expect, it } from 'vitest'
import { resolveVertexNormal } from './displacementNormal'

describe('resolveVertexNormal', () => {
  it('prefers normalized smooth normal from map', () => {
    const out = resolveVertexNormal({
      key: 'k',
      triIdx: 0,
      vertexOffset: 0,
      smoothNrmMap: new Map([['k', [0, 3, 4]]]),
    })
    expect(out.x).toBeCloseTo(0, 8)
    expect(out.y).toBeCloseTo(0.6, 8)
    expect(out.z).toBeCloseTo(0.8, 8)
  })

  it('falls back to per-vertex normals when smooth normal is missing', () => {
    const out = resolveVertexNormal({
      key: 'k',
      triIdx: 0,
      vertexOffset: 3,
      smoothNrmMap: new Map(),
      normals: new Float32Array([0, 0, 1, 2, 0, 0]),
      triNormals: new Float32Array([0, 1, 0]),
    })
    expect(out.x).toBeCloseTo(1, 8)
    expect(out.y).toBeCloseTo(0, 8)
    expect(out.z).toBeCloseTo(0, 8)
  })

  it('falls back to per-triangle normals when per-vertex normals are absent', () => {
    const out = resolveVertexNormal({
      key: 'k',
      triIdx: 1,
      vertexOffset: 0,
      smoothNrmMap: new Map(),
      triNormals: new Float32Array([0, 0, 1, 0, 5, 0]),
    })
    expect(out.x).toBeCloseTo(0, 8)
    expect(out.y).toBeCloseTo(1, 8)
    expect(out.z).toBeCloseTo(0, 8)
  })
})
