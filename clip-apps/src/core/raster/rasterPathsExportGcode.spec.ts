import { describe, expect, it } from 'vitest'
import { buildRasterPathsExportGcode } from './rasterPathsExportGcode'
import { getCachedGcodePathBuild, resetGcodePathBuildCacheForTests } from '@/core/gcode/gcodePathBuildCache'

describe('buildRasterPathsExportGcode', () => {
  it('produces parseable motion for path preview', () => {
    const g = buildRasterPathsExportGcode({
      paths: [{ points: [[0, 0, 0], [5, 0, 0], [5, 5, 1]] }],
    })
    expect(g).toContain('G1')
    resetGcodePathBuildCacheForTests()
    const built = getCachedGcodePathBuild(g)
    expect(built.vertexCount).toBeGreaterThan(2)
    expect(built.endPosition.x).toBe(5)
  })
})
