// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildTexturizerMediumRegressionVertices } from '@/core/texturizer/texturizerMediumMesh'
import { evaluateTexturizerLiveMeshSoak } from '@/core/texturizer/texturizerLiveMeshSoak'

describe('texturizerLiveMeshSoak', () => {
  it('evaluates medium regression mesh without external STL', async () => {
    const vertices = buildTexturizerMediumRegressionVertices()
    const r = await evaluateTexturizerLiveMeshSoak({
      vertices,
      stlPath: 'synthetic-medium-mesh',
      maxTriangles: 50_000,
    })
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.outputTriangles).toBeGreaterThan(0)
    expect(r.binaryStlBytes).toBeGreaterThan(84)
  })
})
