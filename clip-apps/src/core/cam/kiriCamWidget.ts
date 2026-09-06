import * as THREE from 'three'
import type { CamJobInputGeometry } from '@/types/camJob'

export type KiriCamWidgetStub = {
  id: string
  anno: { tab: unknown[] }
  track: {
    box: { w: number; h: number; d: number }
    scale: { x: number; y: number; z: number }
    rot: { x: number; y: number; z: number }
    pos: { x: number; y: number; z: number }
    top: number
    mirror: boolean
    indexed: boolean
    ignore: boolean
    indexRad?: number
  }
  slices: unknown[]
  camops: unknown[]
  cache: Record<string, unknown>
  stats: Record<string, unknown>
  meta: { disabled: boolean }
  maxToolDiam: number
  terrain: unknown
  mesh: THREE.Mesh
  getBoundingBox(): { min: THREE.Vector3; max: THREE.Vector3; dim: THREE.Vector3 }
  getPositionBox(): { min: THREE.Vector3; max: THREE.Vector3 }
  getGeoVertices(opt?: { unroll?: boolean; translate?: boolean }): Float32Array
  setAxisIndex(_deg: number): void
}

function meshFromGeometry(geometry: CamJobInputGeometry): THREE.Mesh {
  const { bbox, vertices } = geometry
  let geom: THREE.BufferGeometry
  if (vertices && vertices.length >= 9) {
    geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(vertices.slice(), 3))
    geom.computeBoundingBox()
  } else {
    const dx = Math.max(bbox.maxX - bbox.minX, 1e-3)
    const dy = Math.max(bbox.maxY - bbox.minY, 1e-3)
    const dz = Math.max(bbox.maxZ - bbox.minZ, 1e-3)
    const cx = (bbox.minX + bbox.maxX) / 2
    const cy = (bbox.minY + bbox.maxY) / 2
    const cz = (bbox.minZ + bbox.maxZ) / 2
    geom = new THREE.BoxGeometry(dx, dy, dz)
    geom.translate(cx, cy, cz)
  }
  return new THREE.Mesh(geom)
}

function boundsFromBbox(bbox: CamJobInputGeometry['bbox']) {
  const dimX = bbox.maxX - bbox.minX
  const dimY = bbox.maxY - bbox.minY
  const dimZ = bbox.maxZ - bbox.minZ
  const min = new THREE.Vector3(bbox.minX, bbox.minY, bbox.minZ)
  const max = new THREE.Vector3(bbox.maxX, bbox.maxY, bbox.maxZ)
  const dim = new THREE.Vector3(dimX, dimY, dimZ)
  return { min, max, dim }
}

/**
 * Minimal Kiri `Widget` surface for `cam_slice` / `cam_export` in clip-apps.
 */
export function buildKiriCamWidget(geometry: CamJobInputGeometry): KiriCamWidgetStub {
  const mesh = meshFromGeometry(geometry)
  const bounds = boundsFromBbox(geometry.bbox)
  const track = {
    box: { w: bounds.dim.x, h: bounds.dim.y, d: bounds.dim.z },
    scale: { x: 1, y: 1, z: 1 },
    rot: { x: 0, y: 0, z: 0 },
    pos: { x: 0, y: 0, z: 0 },
    top: geometry.bbox.maxZ,
    mirror: false,
    indexed: false,
    ignore: false,
  }

  const stub: KiriCamWidgetStub = {
    id: geometry.id,
    anno: { tab: [] },
    track,
    slices: [],
    camops: [],
    cache: {},
    stats: {},
    meta: { disabled: false },
    maxToolDiam: 0,
    terrain: undefined,
    mesh,
    getBoundingBox() {
      return bounds
    },
    getPositionBox() {
      return {
        min: bounds.min.clone(),
        max: bounds.max.clone(),
      }
    },
    getGeoVertices(opt: { unroll?: boolean; translate?: boolean } = {}) {
      const geo = mesh.geometry as THREE.BufferGeometry
      const attr = geo.getAttribute('position') as THREE.BufferAttribute
      let pos: Float32Array | number[] = attr.array as Float32Array
      if (geo.index && opt.unroll !== false) {
        const idx = geo.index.array
        const pp2 = new Float32Array(idx.length * 3)
        let inc = 0
        for (let i = 0; i < idx.length; i += 1) {
          const ip = (idx[i] as number) * 3
          pp2[inc++] = pos[ip]!
          pp2[inc++] = pos[ip + 1]!
          pp2[inc++] = pos[ip + 2]!
        }
        pos = pp2
      } else if (opt.translate) {
        pos = (pos as Float32Array).slice()
      }
      stub.cache.geo = pos
      return pos as Float32Array
    },
    setAxisIndex(_deg: number) {},
  }
  return stub
}
