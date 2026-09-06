import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'
import { buildTexturizerMediumRegressionVertices, TEXTURIZER_MEDIUM_MESH_TRIANGLE_COUNT } from './texturizerMediumMesh'
import { TEXTURIZER_MEDIUM_MESH_GOLDEN } from './texturizerMediumMeshGolden'
import { texturizerVertexZStats } from './texturizerResultVertexStats'

describe('texturizerMediumMeshGolden', () => {
  it('medium grid mesh matches pinned vertex stats', () => {
    const g = TEXTURIZER_MEDIUM_MESH_GOLDEN
    const orig = buildTexturizerMediumRegressionVertices()
    expect(orig.length / 9).toBe(TEXTURIZER_MEDIUM_MESH_TRIANGLE_COUNT)

    const result = runTexturizerJob({
      req: {
        vertices: orig,
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 0,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: p.x, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    if (result.kind !== 'result') return

    expect(result.summary.vertexCount).toBe(g.vertexCount)
    expect(result.meta?.preTriCount).toBe(g.preTriCount)
    expect(result.meta?.postSubdivTriCount).toBe(g.postSubdivTriCount)
    expect(result.meta?.postDecimateTriCount).toBe(g.postDecimateTriCount)

    const stats = texturizerVertexZStats(result.vertices, orig)
    expect(stats.minDeltaZ).toBeCloseTo(g.minDeltaZ, 6)
    expect(stats.maxDeltaZ).toBeCloseTo(g.maxDeltaZ, 6)
  })
})
