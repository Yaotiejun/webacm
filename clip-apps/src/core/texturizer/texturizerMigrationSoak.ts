import { runTexturizerJob } from '@/core/texturizer/texturizerJob'
import { buildTexturizerMediumRegressionVertices } from '@/core/texturizer/texturizerMediumMesh'
import { TEXTURIZER_MEDIUM_MESH_GOLDEN } from '@/core/texturizer/texturizerMediumMeshGolden'
import { texturizerVertexZStats } from '@/core/texturizer/texturizerResultVertexStats'

export interface TexturizerMigrationSoakResult {
  ok: boolean
  mediumGoldenMatch: boolean
  errors: string[]
}

/** Offline migration soak: medium mesh regression matches pinned golden stats. */
export function evaluateTexturizerMigrationSoak(): TexturizerMigrationSoakResult {
  const errors: string[] = []
  const g = TEXTURIZER_MEDIUM_MESH_GOLDEN
  const orig = buildTexturizerMediumRegressionVertices()
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

  let mediumGoldenMatch = false
  if (result.kind !== 'result') {
    errors.push(`texturizer job failed: ${result.kind}`)
  } else {
    const stats = texturizerVertexZStats(result.vertices, orig)
    mediumGoldenMatch =
      result.summary.vertexCount === g.vertexCount &&
      result.meta?.preTriCount === g.preTriCount &&
      result.meta?.postSubdivTriCount === g.postSubdivTriCount &&
      Math.abs(stats.minDeltaZ - g.minDeltaZ) < 1e-6 &&
      Math.abs(stats.maxDeltaZ - g.maxDeltaZ) < 1e-6
    if (!mediumGoldenMatch) errors.push('medium mesh golden stats mismatch')
  }

  return {
    ok: errors.length === 0,
    mediumGoldenMatch,
    errors,
  }
}
