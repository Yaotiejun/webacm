import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  getCarveraMachineModelRegistered,
  registerCarveraMachineModel,
  setCarveraFourthFixtureVisible,
} from './carveraMachinePreviewBridge'

describe('carveraMachinePreviewBridge', () => {
  it('toggles fourth fixture mesh visibility', () => {
    const root = new THREE.Group()
    const fourth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    fourth.name = 'fourth'
    fourth.visible = false
    root.add(fourth)
    registerCarveraMachineModel(root)
    expect(getCarveraMachineModelRegistered()).toBe(true)
    setCarveraFourthFixtureVisible(true)
    expect(fourth.visible).toBe(true)
    registerCarveraMachineModel(null)
  })
})
