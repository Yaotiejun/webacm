import { describe, expect, it, vi } from 'vitest'
import { resolveVertexGrey01 } from './displacementGreyResolve'

const cubicSettings = {
  mappingMode: 6,
  scaleU: 1,
  scaleV: 1,
  offsetU: 0,
  offsetV: 0,
  mappingBlend: 0,
  seamBandWidth: 0.35,
  capAngle: 20,
  textureAspectU: 1,
  textureAspectV: 1,
} as const

const cubicSampleBase = {
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

describe('resolveVertexGrey01', () => {
  it('uses computeUV + mapped path when mapping is not cubic', () => {
    const computeUV = vi.fn(() => ({ u: 0.25, v: 0.25 }))
    const sampleGray = vi.fn((u: number, v: number) => u + v)
    const out = resolveVertexGrey01({
      mappingMode: 0,
      cubicMappingMode: 6,
      zoneAreas: [5, 0, 0],
      cubicSampleBase,
      sampleGray,
      computeUV,
      uvPoint: { x: 0, y: 0, z: 0 },
      uvNormal: { x: 0, y: 0, z: 1 },
      uvSettings: {},
      uvBounds: {},
    })
    expect(computeUV).toHaveBeenCalledTimes(1)
    expect(out).toBeCloseTo(0.5, 8)
  })

  it('uses computeUV path when cubic but zone samples are empty', () => {
    const computeUV = vi.fn(() => ({ u: 0, v: 0 }))
    const sampleGray = vi.fn(() => 0.42)
    const out = resolveVertexGrey01({
      mappingMode: 6,
      cubicMappingMode: 6,
      zoneAreas: [0, 0, 0],
      cubicSampleBase,
      sampleGray,
      computeUV,
      uvPoint: { x: 1, y: 1, z: 1 },
      uvNormal: { x: 0, y: 0, z: 1 },
      uvSettings: cubicSettings,
      uvBounds: {},
    })
    expect(computeUV).toHaveBeenCalledTimes(1)
    expect(out).toBeCloseTo(0.42, 8)
  })

  it('uses zone-area weighted samples when cubic and zone signal is present', () => {
    const computeUV = vi.fn(() => ({ u: 0, v: 0 }))
    const sampleGray = vi.fn(() => 0.3)
    const out = resolveVertexGrey01({
      mappingMode: 6,
      cubicMappingMode: 6,
      zoneAreas: [5, 0, 0],
      cubicSampleBase,
      sampleGray,
      computeUV,
      uvPoint: cubicSampleBase.point,
      uvNormal: cubicSampleBase.normal,
      uvSettings: cubicSettings,
      uvBounds: {},
    })
    expect(computeUV).not.toHaveBeenCalled()
    expect(sampleGray).toHaveBeenCalled()
    expect(out).toBeCloseTo(0.3, 8)
  })
})
