import { describe, expect, it } from 'vitest'
import {
  compareBundledGripCamSectionMotion,
  splitBundledGripCamGcodeByCaptureSections,
} from './camGripFixtureBundledSections'

describe('camGripFixtureBundledSections', () => {
  it('splits bundled capture into header, op-0-rough, footer', () => {
    const slices = splitBundledGripCamGcodeByCaptureSections()
    expect(slices.map((s) => s.section)).toEqual(['header', 'op-0-rough', 'footer'])
    expect(slices[0]!.gcodeText).toMatch(/G21/)
    expect(slices[1]!.gcodeText).toMatch(/starting rough op/i)
    expect(slices[2]!.gcodeText).toMatch(/ending rough op/i)
  })

  it('compareBundledGripCamSectionMotion matches pinned stats', () => {
    expect(compareBundledGripCamSectionMotion().match).toBe(true)
  })
})
