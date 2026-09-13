import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { parseObjToTriangleSoup } from '@/core/mesh/loadObj'
import type { CamJobInputGeometry } from '@/types/camJob'

export function calcMeshBbox(vertices: Float32Array): CamJobInputGeometry['bbox'] {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] ?? 0
    const y = vertices[i + 1] ?? 0
    const z = vertices[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 }
  }
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export type LoadedPartMesh = {
  vertices: Float32Array
  format: 'stl' | 'obj'
  scaledFromMeters: boolean
  triangleCount: number
}

/** Load STL or OBJ file bytes/text into a non-indexed triangle soup (mm). */
export async function loadPartMeshFromFile(file: File): Promise<LoadedPartMesh> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.stl')) {
    const buf = await file.arrayBuffer()
    const loader = new STLLoader()
    const geometry = loader.parse(buf)
    // Ensure non-indexed triangle soup (geoSlice / MVP walk i+=9)
    if (geometry.index) geometry.toNonIndexed()
    const attr = geometry.getAttribute('position')
    const arr = attr.array as ArrayLike<number>
    const verts = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i += 1) verts[i] = Number(arr[i]) || 0
    return {
      vertices: verts,
      format: 'stl',
      scaledFromMeters: false,
      triangleCount: Math.floor(verts.length / 9),
    }
  }
  if (lower.endsWith('.obj')) {
    const text = await file.text()
    const { vertices, scaledFromMeters } = parseObjToTriangleSoup(text, { autoscale: true })
    return {
      vertices,
      format: 'obj',
      scaledFromMeters,
      triangleCount: Math.floor(vertices.length / 9),
    }
  }
  throw new Error(`unsupported part format: ${file.name}`)
}

export function toCamJobInputGeometry(id: string, mesh: LoadedPartMesh): CamJobInputGeometry {
  return {
    id,
    bbox: calcMeshBbox(mesh.vertices),
    vertices: mesh.vertices,
    complexityHint: Math.max(1, mesh.triangleCount),
  }
}
