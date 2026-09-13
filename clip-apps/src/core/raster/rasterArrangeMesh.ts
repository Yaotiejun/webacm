/**
 * Build Three.js meshes for Raster arrange (terrain + tool on platform).
 * Viewport is Y-up: WCS (x,y,z) -> Three (x, z, y). Seat: center XY, min Z on bed.
 * Display seating does not mutate worker input triangles.
 */
import * as THREE from 'three'

export type RasterSeatTransform = {
  cx: number
  cy: number
  minZ: number
  vertices: Float32Array
}

/** Center XY and seat min Z on bed - display only (same idea as CAM/SLA). */
export function seatRasterVertices(vertices: Float32Array): RasterSeatTransform {
  if (!vertices.length || vertices.length % 3 !== 0) {
    throw new Error('invalid raster mesh vertices')
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
  if (!Number.isFinite(minX)) throw new Error('empty raster mesh')
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

/** Apply an existing seat transform (keep tool aligned to terrain). */
export function applyRasterSeat(
  vertices: Float32Array,
  seat: Pick<RasterSeatTransform, 'cx' | 'cy' | 'minZ'>,
): Float32Array {
  if (!vertices.length || vertices.length % 3 !== 0) {
    throw new Error('invalid raster mesh vertices')
  }
  const out = new Float32Array(vertices.length)
  for (let i = 0; i < vertices.length; i += 3) {
    out[i] = vertices[i]! - seat.cx
    out[i + 1] = vertices[i + 1]! - seat.cy
    out[i + 2] = vertices[i + 2]! - seat.minZ
  }
  return out
}

function meshFromWcsVertices(
  wcs: Float32Array,
  opts: { name: string; color: number },
): THREE.Mesh {
  const positions = new Float32Array(wcs.length)
  for (let i = 0; i < wcs.length; i += 3) {
    positions[i] = wcs[i]!
    positions[i + 1] = wcs[i + 2]!
    positions[i + 2] = wcs[i + 1]!
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.computeVertexNormals()
  geom.computeBoundingBox()
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color,
    metalness: 0.05,
    roughness: 0.55,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.name = opts.name
  return mesh
}

export function buildRasterTerrainArrangeMesh(vertices: Float32Array): THREE.Mesh {
  const seated = seatRasterVertices(vertices)
  return meshFromWcsVertices(seated.vertices, {
    name: 'raster-terrain-arrange-mesh',
    color: 0x13c2c2,
  })
}

/** Tool mesh; pass terrainSeat to keep WCS alignment with terrain. */
export function buildRasterToolArrangeMesh(
  vertices: Float32Array,
  terrainSeat?: Pick<RasterSeatTransform, 'cx' | 'cy' | 'minZ'> | null,
): THREE.Mesh {
  const wcs = terrainSeat
    ? applyRasterSeat(vertices, terrainSeat)
    : seatRasterVertices(vertices).vertices
  return meshFromWcsVertices(wcs, {
    name: 'raster-tool-arrange-mesh',
    color: 0xfa8c16,
  })
}

export function setRasterArrangeMeshGhost(mesh: THREE.Mesh | null, ghost: boolean) {
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

export function disposeRasterObject3D(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh
    mesh.geometry?.dispose?.()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
    else mat?.dispose?.()
  })
}
