/**
 * Build a Three.js mesh for Texturizer arrange (imported / displaced STL on platform).
 * Viewport is Y-up: WCS (x,y,z) -> Three (x, z, y). Seat: center XY, min Z on bed.
 * Display seating does not mutate worker input vertices.
 */
import * as THREE from 'three'

export type TexturizerSeatTransform = {
  cx: number
  cy: number
  minZ: number
  vertices: Float32Array
}

/** Center XY and seat min Z on bed - display only (same idea as CAM/SLA/Raster). */
export function seatTexturizerVertices(vertices: Float32Array): TexturizerSeatTransform {
  if (!vertices.length || vertices.length % 3 !== 0) {
    throw new Error('invalid texturizer mesh vertices')
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
  if (!Number.isFinite(minX)) throw new Error('empty texturizer mesh')
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

/** Vertex normals in WCS for the texturizer worker (optional input). */
export function computeTexturizerVertexNormals(vertices: Float32Array): Float32Array | null {
  if (!vertices.length || vertices.length % 3 !== 0) return null
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(vertices.slice(), 3))
  geom.computeVertexNormals()
  const nrm = geom.getAttribute('normal') as THREE.BufferAttribute | null
  if (!nrm) {
    geom.dispose()
    return null
  }
  const out = new Float32Array(nrm.array.length)
  out.set(nrm.array as ArrayLike<number>)
  geom.dispose()
  return out
}

export function buildTexturizerArrangeMesh(vertices: Float32Array): THREE.Mesh {
  const seated = seatTexturizerVertices(vertices)
  const src = seated.vertices
  const positions = new Float32Array(src.length)
  for (let i = 0; i < src.length; i += 3) {
    positions[i] = src[i]!
    positions[i + 1] = src[i + 2]!
    positions[i + 2] = src[i + 1]!
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4f8ad9,
    metalness: 0.05,
    roughness: 0.55,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.name = 'texturizer-arrange-mesh'
  return mesh
}

export function setTexturizerArrangeMeshGhost(mesh: THREE.Mesh | null, ghost: boolean) {
  if (!mesh) return
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  for (const mat of mats) {
    if (!mat || !(mat as THREE.Material).isMaterial) continue
    const sm = mat as THREE.MeshStandardMaterial
    sm.transparent = ghost
    sm.opacity = ghost ? 0.22 : 1
    sm.depthWrite = !ghost
    sm.needsUpdate = true
  }
}

export function disposeTexturizerObject3D(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh
    mesh.geometry?.dispose?.()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
    else mat?.dispose?.()
  })
}
