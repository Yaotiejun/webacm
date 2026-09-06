import { probeCamLegacyBundle } from '@/core/cam/camLegacyBundleProbe'

export type CamLiveExportMigrationPhase = 'skipped' | 'probe-ok' | 'probe-failed' | 'live-passed' | 'live-failed'

export interface CamLiveExportMigrationResult {
  ok: boolean
  phase: CamLiveExportMigrationPhase
  probeAvailable: boolean
  detail: string
  errors: string[]
}

/**
 * Phase 1 — CAM live export migration.
 * Set `CAM_LIVE_MIGRATION=1` then run `npm run soak:cam:live` for full slice/export parity.
 */
export async function evaluateCamLiveExportMigration(): Promise<CamLiveExportMigrationResult> {
  const requireLive = process.env.CAM_LIVE_MIGRATION === '1'

  if (!requireLive) {
    return {
      ok: true,
      phase: 'skipped',
      probeAvailable: false,
      detail: 'set CAM_LIVE_MIGRATION=1 then npm run soak:cam:live',
      errors: [],
    }
  }

  const probe = await probeCamLegacyBundle()

  if (!probe.available) {
    return {
      ok: false,
      phase: 'probe-failed',
      probeAvailable: false,
      detail: probe.detail,
      errors: [
        'CAM_LIVE_MIGRATION=1 but legacy bundle unavailable (set VITE_KIRI_LEGACY_CAM=1 and sync legacy)',
        probe.detail,
      ],
    }
  }

  return {
    ok: true,
    phase: 'probe-ok',
    probeAvailable: true,
    detail: 'probe ok — run npm run soak:cam:live for full export parity',
    errors: [],
  }
}
