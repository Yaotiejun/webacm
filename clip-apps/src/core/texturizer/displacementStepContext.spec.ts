import { describe, expect, it } from 'vitest'
import { buildDisplacementStepContext } from './displacementStepContext'

describe('buildDisplacementStepContext', () => {
  it('builds context with pass-through function references and fields', () => {
    const getCachedGray = (_k: string, compute: () => number) => compute()
    const sampleGray = (_u: number, _v: number) => 0.5
    const computeUV = () => ({ u: 0, v: 0 })
    const out = buildDisplacementStepContext({
      triUserExcluded: new Uint8Array([0]),
      excludedPosSet: new Set<string>(),
      posKey: (x, y, z) => `${x}_${y}_${z}`,
      smoothNrmMap: new Map(),
      zoneAreaMap: new Map(),
      maskedFracMap: new Map(),
      getCachedGray,
      sampleGray,
      computeUV,
      mappingMode: 0,
      cubicMappingMode: 6,
      uvFrequency: 2,
      cubicSettings: {
        scaleU: 1,
        scaleV: 1,
        offsetU: 0,
        offsetV: 0,
        textureAspectU: 1,
        textureAspectV: 1,
      },
      minX: 1,
      minY: 2,
      minZ: 3,
      maxDim: 4,
      rotRad: 0.5,
      bounds: { a: 1 },
      amplitude: 5,
      symmetricDisplacement: true,
      bottomAngleLimit: 10,
      topAngleLimit: 20,
    })
    expect(out.getCachedGray).toBe(getCachedGray)
    expect(out.sampleGray).toBe(sampleGray)
    expect(out.computeUV).toBe(computeUV)
    expect(out.minX).toBe(1)
    expect(out.maxDim).toBe(4)
    expect(out.amplitude).toBe(5)
    expect(out.topAngleLimit).toBe(20)
  })
})
