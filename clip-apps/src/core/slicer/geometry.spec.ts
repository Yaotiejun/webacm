import { describe, expect, it } from 'vitest'
import { computeVertexBounds3D, pointsFromVertices } from './geometry'

describe('slicer.geometry', () => {
  it('computes 3d bounds from vertex buffer', () => {
    const vertices = new Float32Array([-1, 2, 3, 4, -5, 6, 0, 1, -2])
    const out = computeVertexBounds3D(vertices)
    expect(out).toEqual({
      minX: -1,
      minY: -5,
      minZ: -2,
      maxX: 4,
      maxY: 2,
      maxZ: 6,
    })
  })

  it('maps vertices to point objects', () => {
    const vertices = new Float32Array([1, 2, 3, 4, 5, 6])
    const out = pointsFromVertices(vertices, (x, y, z) => ({ x, y, z }))
    expect(out).toEqual([{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }])
  })

  it('returns null when buffer is empty', () => {
    expect(computeVertexBounds3D(new Float32Array(0))).toBeNull()
  })

  it('returns null when length is not a multiple of 3 (no complete vertices)', () => {
    expect(computeVertexBounds3D(new Float32Array([1, 2]))).toBeNull()
  })
})
