import { describe, expect, it } from 'vitest'
import {
  collectCamExportSectionDepthStats,
  summarizeCamGcodeZDepth,
} from './camGcodeDepthStats'
import {
  compareCamPerOpDepthToGripCapture,
  compareSyntheticOpSectionDepth,
  GRIP_CAM_FIXTURE_Z_DEPTH,
} from './camGripFixtureDepthCompare'
import {
  compareGripFixturePerOpDepth,
  GRIP_CAM_FIXTURE_ROUGH_OP_Z_DEPTH,
} from './camGripFixturePerOpDepth'

describe('camGcodeDepthStats', () => {
  it('summarizes explicit Z on motion lines', () => {
    const s = summarizeCamGcodeZDepth('G0 Z5\nG1 X1\nG1 Z-1 F100\n')
    expect(s.minZ).toBe(-1)
    expect(s.maxZ).toBe(5)
    expect(s.explicitZLines).toBe(2)
  })

  it('collects per-section Z during synthetic export', () => {
    const { sections, depths } = collectCamExportSectionDepthStats((_print, online) => {
      online({ section: 'header' })
      online('G0 Z1\n')
      online({ section: 'op-0-rough' })
      online('G0 Z5\nG1 Z-2\n')
    })
    expect(sections).toEqual(['header', 'op-0-rough'])
    expect(depths[1]).toEqual({
      section: 'op-0-rough',
      minZ: -2,
      maxZ: 5,
      explicitZLines: 2,
    })
  })

  it('live capture Z depth matches pinned fixture', () => {
    const r = compareCamPerOpDepthToGripCapture()
    expect(r.match).toBe(true)
    expect(r.gcode.minZ).toBe(GRIP_CAM_FIXTURE_Z_DEPTH.minZ)
    expect(r.gcode.maxZ).toBe(GRIP_CAM_FIXTURE_Z_DEPTH.maxZ)
  })

  it('synthetic op section depth extraction matches grip export shape', () => {
    expect(compareSyntheticOpSectionDepth().match).toBe(true)
  })

  it('grip fixture rough op Z depth from op markers', () => {
    const r = compareGripFixturePerOpDepth()
    expect(r.match).toBe(true)
    const rough = r.ops.find((o) => o.op === 'rough')
    expect(rough?.depth.minZ).toBe(GRIP_CAM_FIXTURE_ROUGH_OP_Z_DEPTH.minZ)
    expect(rough?.depth.maxZ).toBe(GRIP_CAM_FIXTURE_ROUGH_OP_Z_DEPTH.maxZ)
  })
})
