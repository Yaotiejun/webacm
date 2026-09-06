import { describe, expect, it } from 'vitest'
import {
  CAM_GEOMETRY_MAX_STORED_VERTICES,
  camGeometryMeshLabel,
  hydrateCamJobGeometry,
  serializeCamJobGeometry,
} from './camGeometryPersist'

describe('camGeometryPersist', () => {
  it('round-trips vertices through JSON', () => {
    const verts = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const stored = serializeCamJobGeometry({
      id: 'p',
      bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
      vertices: verts,
    })
    const json = JSON.stringify(stored)
    const back = hydrateCamJobGeometry(JSON.parse(json))
    expect(back.vertices).toBeInstanceOf(Float32Array)
    expect(Array.from(back.vertices!)).toEqual(Array.from(verts))
  })

  it('truncates oversized meshes for storage', () => {
    const n = CAM_GEOMETRY_MAX_STORED_VERTICES + 10
    const verts = new Float32Array(n * 3)
    const stored = serializeCamJobGeometry({
      id: 'big',
      bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
      vertices: verts,
    })
    expect(stored.vertices!.length).toBe(CAM_GEOMETRY_MAX_STORED_VERTICES * 3)
    expect(stored.storedVertexCount).toBe(n)
    expect(camGeometryMeshLabel(stored)).toContain('100000/')
  })
})
