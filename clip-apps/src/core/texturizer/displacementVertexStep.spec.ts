import { describe, expect, it } from 'vitest'
import { stepDisplacementVertex, type DisplacementVertexStepContext } from './displacementVertexStep'

function makeCtx(overrides: Partial<DisplacementVertexStepContext> = {}): DisplacementVertexStepContext {
  return {
    triUserExcluded: new Uint8Array([0]),
    excludedPosSet: new Set<string>(),
    posKey: (x, y, z) => `${x}_${y}_${z}`,
    smoothNrmMap: new Map(),
    zoneAreaMap: new Map(),
    maskedFracMap: new Map(),
    getCachedGray: (_k, compute) => compute(),
    sampleGray: () => 0.75,
    computeUV: () => ({ u: 0, v: 0 }),
    mappingMode: 0,
    cubicMappingMode: 6,
    uvFrequency: 1,
    cubicSettings: {
      scaleU: 1,
      scaleV: 1,
      offsetU: 0,
      offsetV: 0,
      textureAspectU: 1,
      textureAspectV: 1,
    },
    minX: 0,
    minY: 0,
    minZ: 0,
    maxDim: 1,
    rotRad: 0,
    bounds: {},
    amplitude: 2,
    symmetricDisplacement: true,
    bottomAngleLimit: 0,
    topAngleLimit: 0,
    ...overrides,
  }
}

describe('stepDisplacementVertex', () => {
  it('resolves vertex displacement with cached gray path', () => {
    const src = new Float32Array([0, 0, 1, 1, 0, 1, 0, 1, 1])
    const out = stepDisplacementVertex(src, 0, makeCtx({
      smoothNrmMap: new Map([['0_0_1', [0, 0, 1]]]),
      maskedFracMap: new Map([['0_0_1', [0, 1]]]),
    }))
    expect(out.z).toBe(1)
    expect(out.dz).toBeCloseTo(0.5, 8)
    expect(out.nz).toBeCloseTo(1.5, 8)
  })

  it('pins excluded face vertices', () => {
    const src = new Float32Array([0, 0, 1, 1, 0, 1, 0, 1, 1])
    const out = stepDisplacementVertex(src, 0, makeCtx({
      triUserExcluded: new Uint8Array([1]),
      normals: new Float32Array([0, 0, 1]),
      amplitude: 3,
      symmetricDisplacement: false,
      sampleGray: () => 1,
    }))
    expect(out.dz).toBe(0)
    expect(out.nz).toBe(1)
  })

  it('produces stable dz stats on fixed triangle input', () => {
    const src = new Float32Array([0, 0, 1, 1, 0, 1, 0, 1, 1])
    const ctx = makeCtx({
      smoothNrmMap: new Map([
        ['0_0_1', [0, 0, 1]],
        ['1_0_1', [0, 0, 1]],
        ['0_1_1', [0, 0, 1]],
      ]),
      sampleGray: (u, v) => 0.5 + 0.25 * (u + v),
      computeUV: (p: any) => ({ u: p.x * 0.5, v: p.y * 0.5 }),
      amplitude: 2,
      symmetricDisplacement: true,
    })
    let minDz = Infinity
    let maxDz = -Infinity
    for (let i = 0; i < src.length; i += 3) {
      const out = stepDisplacementVertex(src, i, ctx)
      if (out.dz < minDz) minDz = out.dz
      if (out.dz > maxDz) maxDz = out.dz
    }
    expect(minDz).toBeCloseTo(0, 8)
    expect(maxDz).toBeCloseTo(0.25, 8)
  })
})
