/**
 * @vitest-environment jsdom
 * Manual: `CAPTURE_CAM_FIXTURE=1 npx vitest run src/core/cam/camEngine.legacy.capture.spec.ts`
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getKiriCamImpls, getKiriCamLegacyHealth, kiriCamRuntime } from './kiriCamRuntime'
import { runCamJob } from './camEngine'
import { normalizeCamGcodeForMigrationFingerprint, sha256HexUtf8 } from './camGcodeFingerprint'
import { buildCamCaptureGeometry, buildCamCaptureProfile } from './camCaptureProfile'

/** Only included via `vitest.capture.ts` / `npm run capture:cam-fixture`. */
describe('capture grip cam_export fixture', () => {
  beforeAll(async () => {
    await kiriCamRuntime.init()
    const health = getKiriCamLegacyHealth()
    if (!health.hasExport) {
      throw new Error(
        `legacy cam_export not loaded — ${JSON.stringify(health)}. ` +
          'Ensure VITE_KIRI_LEGACY_CAM=1 and legacy/kiri/mode/cam/*.js are present.',
      )
    }
  })

  it('writes fixtures/grip-cam-export-sample.gcode.txt', async () => {
    const result = await runCamJob(buildCamCaptureProfile(), buildCamCaptureGeometry())
    const text = result.gcodeText?.trim() ?? ''
    expect(text.length).toBeGreaterThan(50)

    const dir = path.dirname(fileURLToPath(import.meta.url))
    const outPath = path.join(dir, 'fixtures', 'grip-cam-export-sample.gcode.txt')
    writeFileSync(outPath, `${text}\n`, 'utf8')

    const fp = normalizeCamGcodeForMigrationFingerprint(text)
    const hash = await sha256HexUtf8(fp)
    const sections =
      result.notes
        ?.find((n) => n.startsWith('legacy cam_export sections:'))
        ?.replace('legacy cam_export sections: ', '')
        .split(', ')
        .filter(Boolean) ?? []

    const metaPath = path.join(dir, 'fixtures', 'camGripFixtureCaptured.json')
    writeFileSync(
      metaPath,
      JSON.stringify({ sha256: hash, sections, capturedAt: new Date().toISOString() }, null, 2),
      'utf8',
    )

    // eslint-disable-next-line no-console
    console.log('[CAPTURE_CAM_FIXTURE] SHA-256:', hash)
    // eslint-disable-next-line no-console
    console.log('[CAPTURE_CAM_FIXTURE] sections:', sections.join(', ') || '(none)')
    // eslint-disable-next-line no-console
    console.log('[CAPTURE_CAM_FIXTURE] meta →', metaPath)
  }, 180_000)
})
