import { describe, expect, it } from 'vitest'
import { collectCamExportSectionDepthStats } from './camGcodeDepthStats'
import { emitGripCamFixtureSyntheticExport } from './camGripFixtureSynthetic'
import { GRIP_CAM_SYNTHETIC_SECTION_Z } from './camGripSyntheticSectionStream'

describe('camLegacyExportBundledSectionDepth', () => {
  it('legacy-shaped synthetic cam_export stream has pinned per-section Z', () => {
    const { depths, sections } = collectCamExportSectionDepthStats(
      (_print, online) => emitGripCamFixtureSyntheticExport(online),
      {},
    )
    expect(sections).toContain('op-0-rough')
    expect(sections).toContain('op-1-finish')
    const rough = depths.find((d) => d.section === 'op-0-rough')
    const finish = depths.find((d) => d.section === 'op-1-finish')
    expect(rough).toMatchObject(GRIP_CAM_SYNTHETIC_SECTION_Z.rough)
    expect(finish).toMatchObject(GRIP_CAM_SYNTHETIC_SECTION_Z.finish)
  })
})
