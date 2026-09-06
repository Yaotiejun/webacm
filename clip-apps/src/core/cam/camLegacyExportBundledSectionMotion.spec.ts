import { describe, expect, it } from 'vitest'
import { collectCamExportSectionMotionStats, motionStatsMatch } from './camGcodeSectionMotionStats'
import { emitGripCamFixtureSyntheticExport } from './camGripFixtureSynthetic'
import { GRIP_CAM_SYNTHETIC_SECTION_MOTION } from './camGripSyntheticSectionStream'

describe('camLegacyExportBundledSectionMotion', () => {
  it('synthetic cam_export stream has pinned per-section G0/G1/G2 counts', () => {
    const { motions } = collectCamExportSectionMotionStats((_print, online) =>
      emitGripCamFixtureSyntheticExport(online),
    )
    const pin = GRIP_CAM_SYNTHETIC_SECTION_MOTION
    expect(motionStatsMatch(motions.find((m) => m.section === 'header')!, pin.header)).toBe(true)
    expect(motionStatsMatch(motions.find((m) => m.section === 'op-0-rough')!, pin.rough)).toBe(
      true,
    )
    expect(motionStatsMatch(motions.find((m) => m.section === 'op-1-finish')!, pin.finish)).toBe(
      true,
    )
    expect(motionStatsMatch(motions.find((m) => m.section === 'footer')!, pin.footer)).toBe(true)
  })
})
