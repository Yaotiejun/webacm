import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { exportMeshesVerticesWorld } from './exportSceneVertices'

describe('exportMeshesVerticesWorld', () => {
  it('unrolls indexed geometry into triangle soup', () => {
    // Two triangles sharing verts (indexed quad)
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array([
      0, 0, 0, // 0
      10, 0, 0, // 1
      10, 0, 10, // 2
      0, 0, 10, // 3
    ])
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setIndex([0, 1, 2, 0, 2, 3])

    const mesh = new THREE.Mesh(geom)
    mesh.position.set(0, 5, 0) // seat-like Y offset
    mesh.updateMatrixWorld(true)

    const out = exportMeshesVerticesWorld([mesh], { yUpToZUp: true })
    // 2 tris × 3 verts × 3 comps
    expect(out.length).toBe(18)
    // First vertex (0,0,0) with Y=5 → slicer (x=0, y=0, z=5)
    expect(out[0]).toBeCloseTo(0)
    expect(out[1]).toBeCloseTo(0)
    expect(out[2]).toBeCloseTo(5)
  })

  it('keeps raw XYZ when yUpToZUp is false', () => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]), 3),
    )
    const mesh = new THREE.Mesh(geom)
    const out = exportMeshesVerticesWorld([mesh], { yUpToZUp: false })
    expect(Array.from(out)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
