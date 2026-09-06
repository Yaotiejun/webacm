import * as THREE from 'three'

/** carve-control `canvas.js` `MeshMatcapMaterial` defaults */
export const CARVERA_GRIP_MATCAP_FLAT_SHADING = true
export const CARVERA_GRIP_MATCAP_SIDE = THREE.DoubleSide
export const CARVERA_GRIP_TRANSPARENT_OPACITY = 0.4
/** grip `corner.geometry.translate(0,0,0.01)` after mm scale */
export const CARVERA_GRIP_GEOMETRY_Z_EPSILON_MM = 0.01

export const CARVERA_GRIP_TRANSPARENT_MESH_NAMES = new Set(['corner', 'fourth'])

export function isCarveraGripTransparentMesh(name: string): boolean {
  return CARVERA_GRIP_TRANSPARENT_MESH_NAMES.has(name)
}

/**
 * Matcap material matching grip carve-control preview (not OBJ/MTL materials).
 */
export function createCarveraGripMatcapMaterial(
  colorHex: number,
  opts: { transparent?: boolean; opacity?: number } = {},
): THREE.MeshMatcapMaterial {
  const transparent = opts.transparent ?? false
  const opacity = opts.opacity ?? 1
  return new THREE.MeshMatcapMaterial({
    color: colorHex,
    flatShading: CARVERA_GRIP_MATCAP_FLAT_SHADING,
    side: CARVERA_GRIP_MATCAP_SIDE,
    transparent,
    opacity,
  })
}
