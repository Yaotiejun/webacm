import { describe, expect, it } from 'vitest'
import { compareBundledGripCamSectionMotion } from './camGripFixtureBundledSections'
import { compareLegacyCamExportToGripCapture } from './camLegacyExportStream'
import gripFixtureGcode from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import type { CamJobResult } from '@/types/camJob'
import { GRIP_CAM_LEGACY_CAPTURE_SECTIONS } from './camLegacyExportStream'

describe('camLegacyExportBundledFixtureMotion', () => {
  it('bundled capture G-code has pinned per-section motion stats', () => {
    const r = compareBundledGripCamSectionMotion()
    expect(r.match, r.detail).toBe(true)
  })

  it('bundled fixture still matches full capture pins when section motion passes', async () => {
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
    expect(compareBundledGripCamSectionMotion().match).toBe(true)
    expect(cmp.motionMatch).toBe(true)
    expect(cmp.ok).toBe(true)
  })
})
