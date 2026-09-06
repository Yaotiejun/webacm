import { describe, expect, it } from 'vitest'
import {
  GRIP_CAM_LEGACY_CAPTURE_SECTIONS,
  parseLegacyCamExportSections,
} from './camLegacyExportStream'

describe('camLegacyExportStream', () => {
  it('parses legacy cam_export sections from runCamJob notes', () => {
    expect(
      parseLegacyCamExportSections([
        'Kiri CAM backend via legacy cam_slice',
        'legacy cam_export sections: header, op-0-rough, footer',
        'legacy cam_export enabled',
      ]),
    ).toEqual([...GRIP_CAM_LEGACY_CAPTURE_SECTIONS])
  })
})
