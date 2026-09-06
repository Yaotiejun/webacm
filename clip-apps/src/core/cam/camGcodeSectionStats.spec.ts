import { describe, expect, it } from 'vitest'
import { buildGripCamFixtureSyntheticSections } from './camGripFixtureSynthetic'
import { formatCamExportSectionsList, GRIP_CAM_FIXTURE_SECTIONS } from './camGcodeSectionStats'

describe('camGcodeSectionStats', () => {
  it('formats section list for UI', () => {
    expect(formatCamExportSectionsList(['header', 'op-0-rough'])).toBe(
      'camExport.sections=header, op-0-rough',
    )
  })

  it('live capture sections are pinned separately from synthetic placeholder', () => {
    expect(buildGripCamFixtureSyntheticSections()).not.toEqual([...GRIP_CAM_FIXTURE_SECTIONS])
    expect([...GRIP_CAM_FIXTURE_SECTIONS]).toEqual(['header', 'op-0-rough', 'footer'])
  })
})
