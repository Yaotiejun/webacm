import { describe, expect, it } from 'vitest'
import { buildGripCamFixtureSyntheticSections } from './camGripFixtureSynthetic'
import { compareCamSectionsToGripFixture } from './camGripFixtureSectionCompare'

describe('camGripFixtureSectionCompare', () => {
  it('synthetic export sections differ from live legacy capture pin', () => {
    const r = compareCamSectionsToGripFixture(buildGripCamFixtureSyntheticSections())
    expect(r.match).toBe(false)
  })

  it('reports mismatch', () => {
    const r = compareCamSectionsToGripFixture(['header'])
    expect(r.match).toBe(false)
    expect(r.detail).toContain('不一致')
  })
})
