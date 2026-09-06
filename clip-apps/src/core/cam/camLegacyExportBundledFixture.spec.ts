import { describe, expect, it } from 'vitest'
import gripFixtureGcode from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import type { CamJobResult } from '@/types/camJob'
import {
  compareLegacyCamExportToGripCapture,
  GRIP_CAM_LEGACY_CAPTURE_SECTIONS,
} from './camLegacyExportStream'

/** Always-on gate: bundled capture matches grip pins (no live legacy runtime required). */
describe('camLegacyExportBundledFixture', () => {
  it('bundled grip cam_export matches capture sections, fingerprint, Z, and motion', async () => {
    const result: CamJobResult = {
      backend: 'kiri-cam',
      profileName: 'default',
      deviceName: 'shape_cam_cam',
      processName: 'default',
      stockSize: { x: 30, y: 30, z: 1 },
      zSettings: { anchor: null, bottom: null, clearance: null },
      summary: {
        opCount: 1,
        toolCountUsed: 1,
        estimatedTotalPasses: 1,
        estimatedTotalPathSegments: 100,
        estimatedMachiningTimeMinutes: 1,
      },
      perOp: [],
      notes: [
        'legacy cam_export enabled',
        `legacy cam_export sections: ${GRIP_CAM_LEGACY_CAPTURE_SECTIONS.join(', ')}`,
      ],
      gcodeText: gripFixtureGcode,
    }
    const cmp = await compareLegacyCamExportToGripCapture(result)
    expect(cmp.sections).toEqual([...GRIP_CAM_LEGACY_CAPTURE_SECTIONS])
    expect(cmp.sectionsMatch).toBe(true)
    expect(cmp.fingerprintMatch).toBe(true)
    expect(cmp.zDepthMatch).toBe(true)
    expect(cmp.perOpZDepthMatch).toBe(true)
    expect(cmp.motionMatch).toBe(true)
    expect(cmp.bundledSectionMotionMatch).toBe(true)
    expect(cmp.ok).toBe(true)
  })
})
