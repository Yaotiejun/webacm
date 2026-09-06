import { describe, expect, it } from 'vitest'
import { getCachedGcodePathBuild, resetGcodePathBuildCacheForTests } from '@/core/gcode/gcodePathBuildCache'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from './camGcodeFingerprint'
import { normalizeCamGcodeText } from './camGcodeNormalize'
import fixture from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import { GRIP_CAM_FIXTURE_MIGRATION_SHA256 } from './camGripFixtureMeta'

describe('camGripGcodePathParity', () => {
  it('fixture normalizes to pinned migration SHA-256', async () => {
    const fp = normalizeCamGcodeForMigrationFingerprint(fixture)
    expect(await sha256HexUtf8(fp)).toBe(GRIP_CAM_FIXTURE_MIGRATION_SHA256)
  })

  it('fixture yields a preview polyline with rapid and cut segments', () => {
    resetGcodePathBuildCacheForTests()
    const built = getCachedGcodePathBuild(normalizeCamGcodeText(fixture))
    expect(built.vertexCount).toBeGreaterThan(1)
    expect(built.endPosition.x).toBeDefined()
    expect(built.endPosition.y).toBeDefined()
    expect(built.rapidVertexCount).toBeGreaterThan(0)
    expect(built.cutVertexCount).toBeGreaterThan(0)
    expect(built.segments.some((s) => s.kind === 'cut')).toBe(true)
  })
})
