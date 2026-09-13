/**
 * CAM arrange mesh (Kiri widget on platform).
 * Viewport is Y-up: WCS (x,y,z) → Three (x, z, y). Seat: center XY, min Z on bed.
 */
import * as THREE from 'three'

export type CamSeatTransform = {
  cx: number
  cy: number
  minZ: number
  vertices: Float32Array
}

/** Center XY and seat min Z on bed — same idea as Kiri Widget.center(). */
export function seatCamVertices(vertices: Float32Array): CamSeatTransform {
  if (!vertices.length || vertices.length % 3 !== 0) {
    throw new Error('invalid CAM mesh vertices')
  }
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]!
    const y = vertices[i + 1]!
    const z = vertices[i + 2]!
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  if (!Number.isFinite(minX)) throw new Error('empty CAM mesh')
  const cx = (minX + maxX) * 0.5
  const cy = (minY + maxY) * 0.5
  const out = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i += 3) {
    out[i] = vertices[i]! - cx
    out[i + 1] = vertices[i + 1]! - cy
    out[i + 2] = vertices[i + 2]! - minZ
  }
  return { cx, cy, minZ, vertices: out }
}

export function buildCamArrangeMesh(vertices: Float32Array): THREE.Mesh {
  const seated = seatCamVertices(vertices)
  const src = seated.vertices
  const positions = new Float32Array(src.length)
  for (let i = 0; i < src.length; i += 3) {
    positions[i] = src[i]!
    positions[i + 1] = src[i + 2]!
    positions[i + 2] = src[i + 1]!
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  const mat = new THREE.MeshStandardMaterial({
    color: 0x9ab0c4,
    metalness: 0.08,
    roughness: 0.5,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.name = 'cam-arrange-mesh'
  return mesh
}

export function setCamArrangeMeshGhost(mesh: THREE.Mesh | null, ghost: boolean) {
  if (!mesh) return
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const mat of mats) {
    if (!mat || !(mat as THREE.Material).isMaterial) continue
    const sm = mat as THREE.MeshStandardMaterial
    sm.transparent = ghost
    sm.opacity = ghost ? 0.28 : 1
    sm.depthWrite = !ghost
    sm.needsUpdate = true
  }
}

export function disposeCamObject3D(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh
    mesh.geometry?.dispose?.()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
    else mat?.dispose?.()
  })
}