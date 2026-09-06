import { describe, expect, it } from 'vitest'
import { prepareDisplacementRuntime, resolveDisplacementNormals } from './displacementRuntime'

describe('prepareDisplacementRuntime', () => {
  it('resolves normals usage by subdivision/decimation policy', () => {
    const n = new Float32Array([0, 0, 1])
    expect(resolveDisplacementNormals({ normals: n, subdivisionLevels: 0, decimationRatio: 1 })).toBe(n)
    expect(resolveDisplacementNormals({ normals: n, subdivisionLevels: 1, decimationRatio: 1 })).toBeUndefined()
    expect(resolveDisplacementNormals({ normals: n, subdivisionLevels: 0, decimationRatio: 0.9 })).toBeUndefined()
  })

  it('builds displacement step context and vertex count', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = prepareDisplacementRuntime({
      src,
      userExcludedMask: new Uint8Array([0]),
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      mappingMode: 0,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      posKey: (x, y, z) => `${x}_${y}_${z}`,
      imgW: 2,
      imgH: 2,
      scaleU: 1,
      scaleV: 1,
      offsetU: 0,
      offsetV: 0,
      rotationDeg: 0,
      capAngle: 20,
      uvFrequency: 1,
      sampleGray: () => 0.5,
      computeUV: () => ({ u: 0, v: 0 }),
      getCachedGray: (_k, compute) => compute(),
      cubicMappingMode: 6,
      amplitude: 1,
      symmetricDisplacement: false,
    })
    expect(out.vertexCount).toBe(3)
    expect(out.displacementStepCtx.maxDim).toBeCloseTo(1, 8)
    expect(out.displacementStepCtx.triNormals?.length).toBe(3)
  })
})
