import * as THREE from 'three'

/**
 * Kiri-style seating in **Z-up** platform space (bed = XY, up = Z):
 * center on XY, put min Z on the bed. Mutates `obj.position` only.
 * Matches `widget.center()` in Kiri-Moto.
 */
export function seatObjectOnBedZ(obj: THREE.Object3D): void {
  obj.updateWorldMatrix(true, true)
  // Prefer geometry-local bounds when the object is a single mesh at identity parent.
  const box = new THREE.Box3().setFromObject(obj)
  if (box.isEmpty()) return

  // When `obj` lives under a display rotation parent, setFromObject is in world space.
  // Callers should seat **before** parenting under a rotated display root, or pass a
  // parent-local box. For FDM we seat while parent is still unrotated / identity.
  const cx = (box.min.x + box.max.x) * 0.5
  const cy = (box.min.y + box.max.y) * 0.5
  const minZ = box.min.z
  obj.position.x -= cx
  obj.position.y -= cy
  obj.position.z -= minZ
}

/**
 * Seat using an explicit AABB already in the object's parent (platform) space.
 * Use this when the object is under a rotated display root.
 */
export function seatObjectOnBedZWithBox(
  obj: THREE.Object3D,
  box: { min: THREE.Vector3; max: THREE.Vector3 },
): void {
  const cx = (box.min.x + box.max.x) * 0.5
  const cy = (box.min.y + box.max.y) * 0.5
  obj.position.x -= cx
  obj.position.y -= cy
  obj.position.z -= box.min.z
}

/** Compute AABB of `obj` in `spaceRoot` local coordinates (Kiri platform space). */
export function computeAabbInSpace(obj: THREE.Object3D, spaceRoot: THREE.Object3D): THREE.Box3 {
  spaceRoot.updateWorldMatrix(true, true)
  obj.updateWorldMatrix(true, true)
  const inv = spaceRoot.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const v = new THREE.Vector3()

  obj.traverse((c) => {
    const mesh = c as THREE.Mesh
    if (!(mesh as any).isMesh) return
    let geom = mesh.geometry as THREE.BufferGeometry | undefined
    if (!geom?.attributes?.position) return
    if (geom.index) geom = geom.toNonIndexed()
    const pos = geom.attributes.position as THREE.BufferAttribute
    mesh.updateWorldMatrix(true, false)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      v.applyMatrix4(mesh.matrixWorld)
      v.applyMatrix4(inv)
      box.expandByPoint(v)
    }
  })
  return box
}

/**
 * Export triangle soup in `spaceRoot` local space (Kiri Z-up when spaceRoot is the
 * FDM display/platform root). Ignores display-only world rotation baked into matrixWorld.
 */
export function exportMeshesVerticesInSpace(
  roots: Iterable<THREE.Object3D>,
  spaceRoot: THREE.Object3D,
): Float32Array {
  spaceRoot.updateWorldMatrix(true, true)
  const inv = spaceRoot.matrixWorld.clone().invert()
  const verts: number[] = []
  const v = new THREE.Vector3()

  for (const obj of roots) {
    obj.updateWorldMatrix(true, true)
    obj.traverse((c) => {
      const mesh = c as THREE.Mesh
      if (!(mesh as any).isMesh) return
      let geom = mesh.geometry as THREE.BufferGeometry | undefined
      if (!geom?.attributes?.position) return
      if (geom.index) geom = geom.toNonIndexed()
      const pos = geom.attributes.position as THREE.BufferAttribute
      if (!pos) return
      mesh.updateWorldMatrix(true, false)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        v.applyMatrix4(mesh.matrixWorld)
        v.applyMatrix4(inv)
        verts.push(v.x, v.y, v.z)
      }
    })
  }
  return new Float32Array(verts)
}

/** @deprecated Prefer keeping Z-up geometry + display rotation (Kiri WORLD). */
export function swizzleZUpPositionsToYUp(positions: THREE.BufferAttribute | Float32Array): void {
  if (positions instanceof Float32Array) {
    for (let i = 0; i + 2 < positions.length; i += 3) {
      const y = positions[i + 1]!
      const z = positions[i + 2]!
      positions[i + 1] = z
      positions[i + 2] = y
    }
    return
  }
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const z = positions.getZ(i)
    positions.setY(i, z)
    positions.setZ(i, y)
  }
  positions.needsUpdate = true
}

/** @deprecated */
export function swizzleZUpGeometryToYUp(geom: THREE.BufferGeometry): void {
  if (geom.index) {
    const nonIndexed = geom.toNonIndexed()
    geom.copy(nonIndexed)
    nonIndexed.dispose()
  }
  const pos = geom.attributes.position as THREE.BufferAttribute | undefined
  if (!pos) return
  swizzleZUpPositionsToYUp(pos)
  geom.computeBoundingBox()
  geom.computeVertexNormals()
}

/** @deprecated use seatObjectOnBedZ */
export function seatObjectOnBedY(obj: THREE.Object3D): void {
  obj.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(obj)
  if (box.isEmpty()) return
  obj.position.x -= (box.min.x + box.max.x) * 0.5
  obj.position.z -= (box.min.z + box.max.z) * 0.5
  obj.position.y -= box.min.y
}

/** @deprecated */
export function swizzleObjectZUpToYUp(root: THREE.Object3D): void {
  root.traverse((c) => {
    const mesh = c as THREE.Mesh
    if (!(mesh as any).isMesh) return
    const geom = mesh.geometry as THREE.BufferGeometry | undefined
    if (!geom) return
    mesh.geometry = geom.clone()
    swizzleZUpGeometryToYUp(mesh.geometry as THREE.BufferGeometry)
  })
}
