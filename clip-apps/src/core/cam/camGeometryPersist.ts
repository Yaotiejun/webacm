import type { CamJobInputGeometry } from '@/types/camJob'

/** Max triangle vertices stored in localStorage / session bundle (~100k tris). */
export const CAM_GEOMETRY_MAX_STORED_VERTICES = 100_000

export type CamJobInputGeometryStored = Omit<CamJobInputGeometry, 'vertices'> & {
  vertices?: number[]
  /** Original triangle count when vertices were truncated for storage. */
  storedVertexCount?: number
}

export function serializeCamJobGeometry(geometry: CamJobInputGeometry): CamJobInputGeometryStored {
  const { vertices, ...rest } = geometry
  if (!vertices?.length) return { ...rest }
  const triCount = vertices.length / 3
  const maxFloats = CAM_GEOMETRY_MAX_STORED_VERTICES * 3
  if (vertices.length <= maxFloats) {
    return { ...rest, vertices: Array.from(vertices), storedVertexCount: triCount }
  }
  return {
    ...rest,
    vertices: Array.from(vertices.subarray(0, maxFloats)),
    storedVertexCount: triCount,
  }
}

export function hydrateCamJobGeometry(
  stored: CamJobInputGeometry | CamJobInputGeometryStored,
): CamJobInputGeometry {
  const raw = stored as CamJobInputGeometryStored
  const base: CamJobInputGeometry = {
    id: raw.id,
    bbox: { ...raw.bbox },
    complexityHint: raw.complexityHint,
  }
  if (!raw.vertices?.length) return base
  return { ...base, vertices: new Float32Array(raw.vertices) }
}

export function camGeometryMeshLabel(geometry: CamJobInputGeometry | CamJobInputGeometryStored): string {
  const raw = geometry as CamJobInputGeometryStored
  if (raw.vertices?.length) {
    const tris = Math.floor(raw.vertices.length / 3)
    const orig = raw.storedVertexCount
    if (orig && orig > tris) return `STL mesh ${tris} tris（存 ${tris}/${orig}）`
    return `STL mesh ${tris} tris`
  }
  return 'bbox 盒体'
}
