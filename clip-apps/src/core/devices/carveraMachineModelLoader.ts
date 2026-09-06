import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import {
  CARVERA_OBJ_METERS_TO_MM,
  CARVERA_OBJ_PUBLIC_URL,
  CARVERA_OBJ_WCS_ZERO_OFFSET_MM,
} from '@/core/devices/carveraMachineModel'
import { applyCarveraGripPreviewStyle } from '@/core/devices/carveraMachineGripPreviewStyle'
import { registerCarveraMachineModel } from '@/core/devices/carveraMachinePreviewBridge'

/** Machine XYZ (mm) → Three.js (Y-up, same as gcode viewport). */
export function carveraMachineMmToThree(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, v.y)
}

function computeWcsZeroMm(root: THREE.Object3D): THREE.Vector3 | null {
  const corner = root.getObjectByName('corner')
  if (!(corner instanceof THREE.Mesh)) return null
  const geo = corner.geometry
  geo.computeBoundingBox()
  const cmin = geo.boundingBox?.min
  if (!cmin) return null
  const s = CARVERA_OBJ_METERS_TO_MM
  return new THREE.Vector3(
    cmin.x * s + CARVERA_OBJ_WCS_ZERO_OFFSET_MM.dx,
    cmin.y * s + CARVERA_OBJ_WCS_ZERO_OFFSET_MM.dy,
    cmin.z * s + CARVERA_OBJ_WCS_ZERO_OFFSET_MM.dz,
  )
}

/**
 * Load grip Carvera OBJ, scale to mm, align WCS origin to scene origin.
 */
export async function loadCarveraMachineModel(
  url: string = CARVERA_OBJ_PUBLIC_URL,
): Promise<THREE.Group> {
  const group = await new OBJLoader().loadAsync(url)
  group.scale.setScalar(CARVERA_OBJ_METERS_TO_MM)
  applyCarveraGripPreviewStyle(group)

  const zeroMm = computeWcsZeroMm(group)
  if (zeroMm) {
    const offset = carveraMachineMmToThree(zeroMm).multiplyScalar(-1)
    group.position.copy(offset)
  }

  registerCarveraMachineModel(group)
  return group
}

export function disposeCarveraMachineModel(root: THREE.Object3D) {
  registerCarveraMachineModel(null)
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      const m = obj.material
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m?.dispose()
    }
  })
}
