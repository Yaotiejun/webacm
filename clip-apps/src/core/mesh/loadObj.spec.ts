import { describe, expect, it } from 'vitest'
import {
  autoscaleMetersToMm,
  fanTriangulateIndices,
  parseObj,
  parseObjToTriangleSoup,
} from './loadObj'

describe('loadObj (Kiri parity)', () => {
  it('fan-triangulates quads', () => {
    expect(fanTriangulateIndices([1, 2, 3, 4])).toEqual([
      [1, 2, 3],
      [1, 3, 4],
    ])
  })

  it('parses triangle faces into soup', () => {
    const text = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`
    const groups = parseObj(text)
    expect(groups[0]!.faces).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
  })

  it('triangulates n-gons', () => {
    const text = `
v 0 0 0
v 10 0 0
v 10 10 0
v 0 10 0
f 1 2 3 4
`
    const { vertices } = parseObjToTriangleSoup(text, { autoscale: false })
    expect(vertices.length).toBe(18) // 2 tris
  })

  it('autoscales meter-sized meshes to mm', () => {
    const verts = new Float32Array([0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09])
    const r = autoscaleMetersToMm(verts)
    expect(r.scaled).toBe(true)
    expect(verts[0]).toBeCloseTo(10)
  })

  it('does not scale mm-sized meshes', () => {
    const verts = new Float32Array([10, 0, 0, 0, 10, 0, 0, 0, 10])
    expect(autoscaleMetersToMm(verts).scaled).toBe(false)
  })
})
