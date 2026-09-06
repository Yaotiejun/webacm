import { describe, expect, it } from 'vitest'
import {
  compareGripCamSyntheticSectionStream,
  GRIP_CAM_SYNTHETIC_EXPORT_SECTIONS,
} from './camGripSyntheticSectionStream'
import { buildGripCamFixtureSyntheticSections } from './camGripFixtureSynthetic'

describe('camGripSyntheticSectionStream', () => {
  it('synthetic export sections match pinned stream order', () => {
    expect(buildGripCamFixtureSyntheticSections()).toEqual([...GRIP_CAM_SYNTHETIC_EXPORT_SECTIONS])
  })

  it('per-section Z depths match pinned synthetic fixture', () => {
    const r = compareGripCamSyntheticSectionStream()
    expect(r.match).toBe(true)
  })
})
