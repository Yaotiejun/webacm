import * as THREE from 'three'
import { CARVERA_OBJ_METERS_TO_MM, carveraMeshColorForName } from '@/core/devices/carveraMachineModel'
import {
  CARVERA_GRIP_GEOMETRY_Z_EPSILON_MM,
  CARVERA_GRIP_TRANSPARENT_OPACITY,
  createCarveraGripMatcapMaterial,
  isCarveraGripTransparentMesh,
} from '@/core/devices/carveraGripPreviewMaterial'

/**
 * Apply carve-control `canvas.js` mesh materials and corner/fourth styling.
 * Call after OBJ load and mm scale.
 */
export function applyCarveraGripPreviewStyle(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    const transparent = isCarveraGripTransparentMesh(obj.name)
    obj.material = createCarveraGripMatcapMaterial(carveraMeshColorForName(obj.name), {
      transparent,
      opacity: transparent ? CARVERA_GRIP_TRANSPARENT_OPACITY : 1,
    })
    if (transparent) {
      obj.geometry.translate(0, 0, CARVERA_GRIP_GEOMETRY_Z_EPSILON_MM / CARVERA_OBJ_METERS_TO_MM)
    }
    if (obj.name === 'fourth') obj.visible = false
  })
}
