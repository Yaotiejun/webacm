/**
 * @vitest-environment jsdom
 * Phase 1 live: requires VITE_KIRI_LEGACY_CAM=1 and legacy bundle.
 */
import { describe, expect, it } from 'vitest'
import { isCamLegacyExportAvailable, runCamLiveExportGripParity } from './camLiveExportRun'

const runLive = () => process.env.CAM_LIVE_MIGRATION === '1'

describe.skipIf(!runLive())('camLiveExportMigration.live', () => {
  it(
    'runCamJob matches bundled grip capture',
    async () => {
      const r = await runCamLiveExportGripParity()
      if (!r.ok) {
        // eslint-disable-next-line no-console
        console.error('[cam live export]', r.errors, r.compare?.detail)
      }
      expect(isCamLegacyExportAvailable()).toBe(true)
      expect(r.ok).toBe(true)
    },
    180_000,
  )
})
