import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { buildCamArrangeMesh, seatCamVertices } from '@/core/cam/camArrangeMesh'

describe('camArrangeMesh', () => {
  it('seats min Z on bed and centers XY', () => {
    const v = new Float32Array([
      10, 20, 5, 12, 20, 5, 10, 22, 7, 10, 20, 5, 10, 22, 7, 12, 22, 7,
    ])
    const seated = seatCamVertices(v)
    expect(seated.minZ).toBe(5)
    let minZ = Infinity
    for (let i = 2; i < seated.vertices.length; i += 3) minZ = Math.min(minZ, seated.vertices[i]!)
    expect(minZ).toBeCloseTo(0, 6)
  })

  it('maps WCS to Three Y-up like SLA arrange', () => {
    const cube = new Float32Array([
      -5, -5, 0, 5, -5, 0, 5, 5, 0, -5, -5, 0, 5, 5, 0, -5, 5, 0, -5, -5, 10, 5, 5, 10, 5, -5, 10, -5,
      -5, 10, -5, 5, 10, 5, 5, 10,
    ])
    const mesh = buildCamArrangeMesh(cube)
    expect(mesh.name).toBe('cam-arrange-mesh')
    mesh.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(mesh)
    expect(box.min.y).toBeCloseTo(0, 3)
    expect(box.max.y).toBeGreaterThan(0)
  })
})