import { describe, expect, it } from 'vitest'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from './camGcodeFingerprint'
import { verifyCamSessionBundleGcodeSha256 } from './sessionBundleFingerprintVerify'

describe('cam.sessionBundleFingerprintVerify', () => {
  it('skipped when no expected hash', async () => {
    expect(
      await verifyCamSessionBundleGcodeSha256({
        migrationMeta: {},
        targetRun: { result: { gcodeText: 'G1' } },
      }),
    ).toEqual({ status: 'skipped_no_expected' })
  })

  it('cannot_verify when expected hash but no gcode in bundle', async () => {
    const r = await verifyCamSessionBundleGcodeSha256({
      migrationMeta: { engineHints: { targetGcodeSha256: 'abc' } },
      targetRun: { result: {} },
    })
    expect(r.status).toBe('cannot_verify_no_gcode')
    expect(r.expected).toBe('abc')
  })

  it('verify_ok when gcode matches expected sha256', async () => {
    const gcode = 'G21\nG90\n'
    const expected = await sha256HexUtf8(normalizeCamGcodeForMigrationFingerprint(gcode))
    const r = await verifyCamSessionBundleGcodeSha256({
      migrationMeta: { engineHints: { targetGcodeSha256: expected } },
      targetRun: { result: { gcodeText: gcode } },
    })
    expect(r).toEqual({ status: 'verify_ok', expected, computed: expected })
  })

  it('verify_mismatch when gcode does not match', async () => {
    const r = await verifyCamSessionBundleGcodeSha256({
      migrationMeta: { engineHints: { targetGcodeSha256: '0'.repeat(64) } },
      targetRun: { result: { gcodeText: 'G1' } },
    })
    expect(r.status).toBe('verify_mismatch')
    expect(r.expected).toBe('0'.repeat(64))
    expect(r.computed).toBeDefined()
    expect(r.computed).not.toBe(r.expected)
  })
})
