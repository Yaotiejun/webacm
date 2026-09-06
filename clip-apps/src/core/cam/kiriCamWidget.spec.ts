import { describe, expect, it } from 'vitest'
import { buildKiriCamWidget } from './kiriCamWidget'

describe('buildKiriCamWidget', () => {
  it('exposes getGeoVertices for bbox box mesh', () => {
    const w = buildKiriCamWidget({
      id: 'box',
      bbox: { minX: 0, minY: 0, minZ: 0, maxX: 10, maxY: 20, maxZ: 5 },
    })
    const verts = w.getGeoVertices({ unroll: true, translate: true })
    expect(verts.length).toBeGreaterThanOrEqual(36)
    expect(verts.length % 3).toBe(0)
  })

  it('uses provided STL vertices when present', () => {
    const vertices = new Float32Array([
      0, 0, 0, 1, 0, 0, 0, 1, 0,
      0, 0, 0, 1, 0, 0, 0, 0, 1,
    ])
    const w = buildKiriCamWidget({
      id: 'tri',
      bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
      vertices,
    })
    expect(w.getGeoVertices().length).toBe(18)
  })
})
