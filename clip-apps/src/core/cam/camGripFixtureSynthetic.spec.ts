import { describe, expect, it } from 'vitest'
import { buildGripCamFixtureSyntheticGcode } from './camGripFixtureSynthetic'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from './camGcodeFingerprint'
import { normalizeCamGcodeText } from './camGcodeNormalize'
describe('camGripFixtureSynthetic', () => {
  it('builds deterministic placeholder export for tests', () => {
    const g = buildGripCamFixtureSyntheticGcode()
    expect(g).toContain('G21')
    expect(g).toContain('G2 X15 Y7.5')
    expect(normalizeCamGcodeText(g)).toBe(g)
  })

  it('synthetic export has stable migration fingerprint', async () => {
    const fp = normalizeCamGcodeForMigrationFingerprint(buildGripCamFixtureSyntheticGcode())
    expect(await sha256HexUtf8(fp)).toBe(
      '529c6c2b81b7c673714afa3afa910a606efa5358e4c72d4b5dc07024d8fd3b83',
    )
  })
})
