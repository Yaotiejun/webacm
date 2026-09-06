import { describe, expect, it } from 'vitest'
import { buildCubicZoneWeightedSamples } from './cubicZoneSampling'

const baseCtx = {
  point: { x: 2, y: 3, z: 4 },
  normal: { x: 1, y: 0, z: 0 },
  minX: 0,
  minY: 0,
  minZ: 0,
  maxDim: 10,
  rotRad: 0,
  uvFrequency: 1,
  settings: {
    scaleU: 1,
    scaleV: 1,
    offsetU: 0,
    offsetV: 0,
    textureAspectU: 1,
    textureAspectV: 1,
  },
} as const

describe('buildCubicZoneWeightedSamples', () => {
  it('returns null when zone areas are empty', () => {
    const s = buildCubicZoneWeightedSamples({ ...baseCtx, zoneAreas: [0, 0, 0] })
    expect(s).toBeNull()
  })

  it('emits one sample for single-zone input', () => {
    const s = buildCubicZoneWeightedSamples({ ...baseCtx, zoneAreas: [5, 0, 0] })
    expect(s?.length).toBe(1)
    expect(s?.[0]?.w).toBeCloseTo(1, 8)
  })

  it('normalizes weights for multi-zone input', () => {
    const s = buildCubicZoneWeightedSamples({ ...baseCtx, zoneAreas: [2, 3, 5] }) ?? []
    const wsum = s.reduce((acc, x) => acc + x.w, 0)
    expect(s.length).toBe(3)
    expect(wsum).toBeCloseTo(1, 8)
  })
})
