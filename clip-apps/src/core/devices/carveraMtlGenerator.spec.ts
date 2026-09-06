import { describe, expect, it } from 'vitest'
import { buildCarveraMtlDocument, hexStringToKd } from './carveraMtlGenerator'

describe('carveraMtlGenerator', () => {
  it('converts grip hex to MTL Kd', () => {
    const [r, g, b] = hexStringToKd('dddddd')
    expect(r).toBeCloseTo(0.8667, 3)
    expect(g).toBeCloseTo(0.8667, 3)
    expect(b).toBeCloseTo(0.8667, 3)
  })

  it('emits newmtl blocks for carve-control mesh groups', () => {
    const mtl = buildCarveraMtlDocument()
    expect(mtl).toContain('newmtl base')
    expect(mtl).toContain('newmtl plate')
    expect(mtl).toContain('newmtl corner')
    expect(mtl).toMatch(/newmtl corner[\s\S]*d 0\.4/)
    expect(mtl).toContain('newmtl tool-0')
  })
})
