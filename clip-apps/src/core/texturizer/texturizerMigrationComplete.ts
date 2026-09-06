import { evaluateTexturizerLiveMeshSoak } from '@/core/texturizer/texturizerLiveMeshSoak'
import { evaluateTexturizerMigrationSoak } from '@/core/texturizer/texturizerMigrationSoak'
import { buildTexturizerMediumRegressionVertices } from '@/core/texturizer/texturizerMediumMesh'

export interface TexturizerMigrationCompleteResult {
  ok: boolean
  checks: {
    offlineSoak: boolean
    stlExportPipeline: boolean
  }
  errors: string[]
}

/**
 * Migration gate bundle: offline golden + displaced binary STL export pipeline.
 * Production STL verification: `npm run soak:texturizer:live`.
 */
export async function evaluateTexturizerMigrationComplete(): Promise<TexturizerMigrationCompleteResult> {
  const errors: string[] = []
  const offline = evaluateTexturizerMigrationSoak()
  if (!offline.ok) errors.push(...offline.errors)

  const live = await evaluateTexturizerLiveMeshSoak({
    vertices: buildTexturizerMediumRegressionVertices(),
    stlPath: 'synthetic-medium-mesh',
    maxTriangles: 50_000,
  })
  if (!live.ok) errors.push(...live.errors.map((e) => `stl pipeline: ${e}`))

  return {
    ok: errors.length === 0,
    checks: {
      offlineSoak: offline.ok,
      stlExportPipeline: live.ok,
    },
    errors,
  }
}
