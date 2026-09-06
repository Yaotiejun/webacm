import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  CARVERA_MTL_PUBLIC_URL,
  CARVERA_OBJ_METERS_TO_MM,
  CARVERA_OBJ_PUBLIC_URL,
  CARVERA_OBJ_WCS_ZERO_OFFSET_MM,
  carveraMeshColorForName,
} from './carveraMachineModel'
import { carveraMachineMmToThree } from './carveraMachineModelLoader'

describe('carveraMachineModel', () => {
  it('exposes public asset URL and grip scale', () => {
    expect(CARVERA_OBJ_PUBLIC_URL).toBe('/carvera/carvera.obj')
    expect(CARVERA_MTL_PUBLIC_URL).toBe('/carvera/carvera.mtl')
    expect(CARVERA_OBJ_METERS_TO_MM).toBe(1000)
    expect(CARVERA_OBJ_WCS_ZERO_OFFSET_MM.dx).toBeGreaterThan(300)
  })

  it('maps mesh names to carve-control colors', () => {
    expect(carveraMeshColorForName('plate')).toBe(0x999999)
    expect(carveraMeshColorForName('tool-3')).toBe(0xf5d578)
  })

  it('maps machine mm to three Y-up', () => {
    const v = carveraMachineMmToThree(new THREE.Vector3(10, 20, 30))
    expect(v.x).toBe(10)
    expect(v.y).toBe(30)
    expect(v.z).toBe(20)
  })
})
