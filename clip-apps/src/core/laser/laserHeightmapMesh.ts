/**
 * Build a Three.js heightmap mesh for Laser arrange (Kiri image2mesh widget).
 * Viewport uses Y-up: WCS (x,y,z) → (x, z, y).
 */
import * as THREE from 'three'
import type { LaserHeightmap } from '@/core/laser/laserImageHeightmap'

export function buildLaserHeightmapArrangeMesh(hm: LaserHeightmap): THREE.Mesh {
  const w = hm.width
  const h = hm.height
  const { z, scale, widthMm, heightMm } = hm
  const positions = new Float32Array(w * h * 3)
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x
      // Center on bed like Kiri png mesh (-w2..w2)
      const px = x * scale - widthMm / 2
      const py = (h - 1 - y) * scale - heightMm / 2
      const pz = z[i]!
      positions[i * 3] = px
      positions[i * 3 + 1] = pz
      positions[i * 3 + 2] = py
    }
  }
  const indices = new Uint32Array((w - 1) * (h - 1) * 6)
  let ii = 0
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const a = y * w + x
      const b = a + 1
      const c = a + w
      const d = c + 1
      indices[ii++] = a
      indices[ii++] = c
      indices[ii++] = b
      indices[ii++] = b
      indices[ii++] = c
      indices[ii++] = d
    }
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geom.setIndex(new THREE.BufferAttribute(indices, 1))
  geom.computeVertexNormals()
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb8bcc4,
    metalness: 0.08,
    roughness: 0.72,
    side: THREE.DoubleSide,
    flatShading: true,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.name = 'laser-heightmap'
  return mesh
}

export function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh
    mesh.geometry?.dispose?.()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
    else mat?.dispose?.()
  })
}