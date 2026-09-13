import * as THREE from 'three'

export type ExportSceneVerticesOptions = {
  /**
   * Map Three.js Y-up scene coords to Kiri FDM Z-up slicer coords:
   * `(x,y,z)_three → (x, z, y)_slicer` so slicer bed = XY and layer height = Z.
   * Requires meshes to be imported via Z-up→Y-up swizzle (`fdmMeshOrient`).
   * Default true for FDM parity with Kiri-Moto.
   */
  yUpToZUp?: boolean
}

/**
 * Collect triangle-soup positions from scene meshes (world space).
 * Always expands indexed BufferGeometry (Kiri `getGeoVertices({ unroll: true })`).
 */
export function exportMeshesVerticesWorld(
  roots: Iterable<THREE.Object3D>,
  opts: ExportSceneVerticesOptions = {},
): Float32Array {
  const yUpToZUp = opts.yUpToZUp !== false
  const verts: number[] = []
  const v = new THREE.Vector3()

  for (const obj of roots) {
    obj.updateWorldMatrix(true, true)
    obj.traverse((c) => {
      const mesh = c as THREE.Mesh
      if (!(mesh as any).isMesh) return

      let geom = mesh.geometry as THREE.BufferGeometry | undefined
      if (!geom?.attributes?.position) return

      // Indexed OBJ/glTF must be unrolled into face triples for fdm_slice.
      if (geom.index) {
        geom = geom.toNonIndexed()
      }
      const pos = geom.attributes.position as THREE.BufferAttribute
      if (!pos) return

      mesh.updateWorldMatrix(true, false)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        v.applyMatrix4(mesh.matrixWorld)
        if (yUpToZUp) {
          // Three Y-up (GridHelper on XZ) → Kiri Z-up (layers along Z)
          verts.push(v.x, v.z, v.y)
        } else {
          verts.push(v.x, v.y, v.z)
        }
      }
    })
  }

  return new Float32Array(verts)
}
