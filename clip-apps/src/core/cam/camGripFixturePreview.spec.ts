import { describe, expect, it } from 'vitest'
import { getGripCamFixturePreviewGcode } from './camGripFixturePreview'
import { getCachedGcodePathBuild, resetGcodePathBuildCacheForTests } from '@/core/gcode/gcodePathBuildCache'

describe('getGripCamFixturePreviewGcode', () => {
  it('returns parseable normalized gcode', () => {
    resetGcodePathBuildCacheForTests()
    const g = getGripCamFixturePreviewGcode()
    expect(g).toContain('G21')
    expect(g).toContain('M6 T')
    const built = getCachedGcodePathBuild(g)
    expect(built.vertexCount).toBeGreaterThan(10)
    expect(built.cutVertexCount).toBeGreaterThan(0)
  })
})
