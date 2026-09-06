import { describe, expect, it } from 'vitest'
import { exportNonIndexedTrianglesToStlAsciiBlobAsync } from './stlAsciiExport'

describe('exportNonIndexedTrianglesToStlAsciiBlobAsync', () => {
  it('writes a valid ASCII solid with one facet', async () => {
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const blob = await exportNonIndexedTrianglesToStlAsciiBlobAsync(vertices)
    const text = await blob.text()
    expect(text.startsWith('solid ')).toBe(true)
    expect(text).toContain('facet normal')
    expect(text).toContain('outer loop')
    expect(text).toContain('vertex 0.000000 0.000000 0.000000')
    expect(text.trim().endsWith('endsolid shape_cam_texturizer')).toBe(true)
  })

  it('reports monotonic progress for multi-facet meshes', async () => {
    const verts: number[] = []
    for (let i = 0; i < 120; i += 1) {
      const x = i * 0.01
      verts.push(x, 0, 0, x + 0.01, 0, 0, x, 0.01, 0)
    }
    const vertices = new Float32Array(verts)
    const progress: number[] = []
    await exportNonIndexedTrianglesToStlAsciiBlobAsync(vertices, {
      chunkFacets: 8,
      onProgress: (p) => {
        progress.push(p)
      },
    })
    expect(progress.length).toBeGreaterThan(2)
    for (let j = 1; j < progress.length; j += 1) {
      expect((progress[j] ?? 0) + 1e-9).toBeGreaterThanOrEqual(progress[j - 1] ?? 0)
    }
    expect(progress[progress.length - 1]).toBe(1)
  })
})
