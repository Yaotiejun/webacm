import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createCamAnimateMeshHandle } from './camAnimateMeshScene'

describe('camAnimateMeshScene', () => {
  it('mesh_add with indices creates a Mesh', () => {
    const group = new THREE.Group()
    const handle = createCamAnimateMeshHandle(group)
    const pos = new Float32Array([0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0])
    const ind = [0, 1, 2, 0, 2, 3]
    handle.applyEvents([{ mesh_add: { id: 0, ind, pos } }])
    expect(handle.meshCount()).toBe(1)
    expect(group.children[0]).toBeInstanceOf(THREE.Mesh)
    handle.applyEvents([{ mesh_move: { id: 0, pos: { x: 5, y: 2, z: 1 } } }])
    expect(group.children[0]!.position.x).toBe(5)
    expect(group.children[0]!.position.y).toBe(1) // z → y
    expect(group.children[0]!.position.z).toBe(2) // y → z
    handle.applyEvents([{ mesh_del: 0 }])
    expect(handle.meshCount()).toBe(0)
    handle.dispose()
  })

  it('mesh_update re-syncs SAB-backed stock heights into Three attribute', () => {
    if (typeof SharedArrayBuffer === 'undefined') {
      expect(true).toBe(true)
      return
    }
    const group = new THREE.Group()
    const handle = createCamAnimateMeshHandle(group)
    const sab = new SharedArrayBuffer(12 * 4)
    const pos = new Float32Array(sab)
    pos.set([0, 0, 10, 10, 0, 10, 10, 10, 10, 0, 10, 10])
    const ind = [0, 1, 2, 0, 2, 3]
    handle.applyEvents([{ mesh_add: { id: 0, ind, sab } }])
    const mesh = group.children[0] as THREE.Mesh
    const attr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    expect(attr.array[1]).toBe(10) // z→y
    pos[2] = 3
    handle.applyEvents([{ id: 0, mesh_update: 1, progress: 0.5 }])
    expect(attr.array[1]).toBe(3)
    handle.dispose()
  })
})
