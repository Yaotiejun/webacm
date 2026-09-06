import { describe, expect, it } from 'vitest'
import { runDisplacementPass } from './displacementPass'
import type { DisplacementVertexStepContext } from './displacementVertexStep'

function makeCtx(): DisplacementVertexStepContext {
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
  }
}

describe('runDisplacementPass', () => {
  it('writes displaced vertices and returns dz range', () => {
    const src = new Float32Array([
      0, 0, 1,
      1, 0, 1,
      0, 1, 1,
    ])
    const out = new Float32Array(src.length)
    const res = runDisplacementPass({
      src,
      out,
      ctx: makeCtx(),
      vertexCount: 3,
    })
    expect(res.minDz).toBeCloseTo(0, 8)
    expect(res.maxDz).toBeCloseTo(0.5, 8)
    expect(out[2]).toBeCloseTo(1.5, 8)
  })

  it('emits monotonic throttled progress', () => {
    const src = new Float32Array(30 * 3) // 30 vertices
    const out = new Float32Array(src.length)
    const seen: number[] = []
    runDisplacementPass({
      src,
      out,
      ctx: makeCtx(),
      vertexCount: 30,
      onProgress: (p) => seen.push(p),
    })
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1] ?? 0)
    }
    expect(seen.length).toBeGreaterThan(0)
  })
})
