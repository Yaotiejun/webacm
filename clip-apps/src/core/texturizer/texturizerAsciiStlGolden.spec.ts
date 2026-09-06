import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'
import { exportNonIndexedTrianglesToStlAsciiBlobAsync } from './stlAsciiExport'
import {
  TEXTURIZER_ASCII_STL_TRIANGLE_FACET_COUNT,
  TEXTURIZER_ASCII_STL_TRIANGLE_HEADER,
} from './texturizerAsciiStlGolden'

describe('texturizerAsciiStlGolden', () => {
  it('exports one facet ASCII STL for fixed triangle mesh', async () => {
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 0,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    const blob = await exportNonIndexedTrianglesToStlAsciiBlobAsync(result.vertices)
    const text = await blob.text()
    expect(text.startsWith(TEXTURIZER_ASCII_STL_TRIANGLE_HEADER)).toBe(true)
    expect(text).toContain('facet normal')
    expect(text).toContain('endsolid')
    const facets = (text.match(/endfacet/g) ?? []).length
    expect(facets).toBe(TEXTURIZER_ASCII_STL_TRIANGLE_FACET_COUNT)
  })
})
