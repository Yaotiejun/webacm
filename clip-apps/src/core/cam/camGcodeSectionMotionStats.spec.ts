import { describe, expect, it } from 'vitest'
import { collectCamExportSectionMotionStats } from './camGcodeSectionMotionStats'

describe('camGcodeSectionMotionStats', () => {
  it('collects per-section motion during export stream', () => {
    const { sections, motions } = collectCamExportSectionMotionStats((_print, online) => {
      online({ section: 'op-a' })
      online('G0 X0 Y0\nG1 X1 F100\n')
      online({ section: 'op-b' })
      online('G2 X2 I1 J0\n')
    })
    expect(sections).toEqual(['op-a', 'op-b'])
    expect(motions[0]).toMatchObject({ section: 'op-a', g0: 1, g1: 1, g2: 0 })
    expect(motions[1]).toMatchObject({ section: 'op-b', g0: 0, g1: 0, g2: 1 })
  })
})
