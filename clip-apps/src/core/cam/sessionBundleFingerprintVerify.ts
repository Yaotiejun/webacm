import type { CamJobResult } from '@/types/camJob'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from '@/core/cam/camGcodeFingerprint'

export type VerifyCamSessionBundleGcodeSha256Status =
  | 'skipped_no_expected'
  | 'skipped_empty_expected'
  | 'verify_ok'
  | 'verify_mismatch'
  | 'cannot_verify_no_gcode'

export interface VerifyCamSessionBundleGcodeSha256Result {
  status: VerifyCamSessionBundleGcodeSha256Status
  expected?: string
  computed?: string
}

/** When a bundle carries `targetGcodeSha256` and inline `gcodeText`, recompute and compare (migration / integrity). */
export async function verifyCamSessionBundleGcodeSha256(bundle: {
  migrationMeta?: { engineHints?: { targetGcodeSha256?: string | null } }
  targetRun?: { result?: Pick<CamJobResult, 'gcodeText'> }
}): Promise<VerifyCamSessionBundleGcodeSha256Result> {
  const expectedRaw = bundle.migrationMeta?.engineHints?.targetGcodeSha256
  if (expectedRaw == null) return { status: 'skipped_no_expected' }
  const expected = typeof expectedRaw === 'string' ? expectedRaw.trim() : ''
  if (expected.length === 0) return { status: 'skipped_empty_expected' }

  const gcode = bundle.targetRun?.result?.gcodeText
  if (typeof gcode !== 'string' || gcode.length === 0) {
    return { status: 'cannot_verify_no_gcode', expected }
  }

  const computed = await sha256HexUtf8(normalizeCamGcodeForMigrationFingerprint(gcode))
  if (computed === expected) return { status: 'verify_ok', expected, computed }
  return { status: 'verify_mismatch', expected, computed }
}
