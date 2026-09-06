import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { applyCarveraGripPreviewStyle } from './carveraMachineGripPreviewStyle'

describe('carveraMachineGripPreviewStyle', () => {
  it('applies grip matcap materials and fourth default hidden', () => {
    const root = new THREE.Group()
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    plate.name = 'plate'
    const fourth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    fourth.name = 'fourth'
    root.add(plate, fourth)

    applyCarveraGripPreviewStyle(root)

    expect(plate.material.type).toBe('MeshMatcapMaterial')
    expect((plate.material as THREE.MeshMatcapMaterial).color.getHex()).toBe(0x999999)
    expect((fourth.material as THREE.MeshMatcapMaterial).transparent).toBe(true)
    expect((fourth.material as THREE.MeshMatcapMaterial).opacity).toBe(0.4)
    expect(fourth.visible).toBe(false)
  })
})
