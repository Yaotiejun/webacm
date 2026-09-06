import { describe, expect, it } from 'vitest'
import { runDisplacementFaceScan } from './displacementFaceScan'

describe('runDisplacementFaceScan', () => {
  it('builds excluded set and per-triangle exclusion flags', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = runDisplacementFaceScan({
      src,
      triCount: 1,
      userExcludedMask: new Uint8Array([1]),
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      mappingMode: 6,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals: new Float32Array([0, 0, 1]),
      posKey: (x, y, z) => `${x}_${y}_${z}`,
    })
    expect(out.triUserExcluded[0]).toBe(1)
    expect(out.excludedPosSet.size).toBe(3)
  })

  it('accumulates smooth normals and zone areas on cubic mode', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = runDisplacementFaceScan({
      src,
      triCount: 1,
      userExcludedMask: new Uint8Array([0]),
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      mappingMode: 6,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals: new Float32Array([0, 0, 1]),
      posKey: (x, y, z) => `${x}_${y}_${z}`,
    })
    expect(out.smoothNrmMap.size).toBe(3)
    expect(out.zoneAreaMap.size).toBeGreaterThan(0)
  })
})
