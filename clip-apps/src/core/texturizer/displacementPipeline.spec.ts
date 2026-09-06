import { describe, expect, it } from 'vitest'
import { runDisplacementFaceScan } from './displacementFaceScan'
import { normalizeVec3Map } from './displacementAccumulators'
import { resolveCachedGray } from './displacementSampling'
import { sampleGrayBilinear } from './textureSampling'
import { stepDisplacementVertex, type DisplacementVertexStepContext } from './displacementVertexStep'

function posKey(x: number, y: number, z: number): string {
  return `${Math.round(x * 1e4)}_${Math.round(y * 1e4)}_${Math.round(z * 1e4)}`
}

describe('displacement pipeline regression', () => {
  it('keeps stable min/max dz and output z on fixed input', () => {
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const triCount = 1
    const triNormals = new Float32Array([0, 0, 1])
    const scan = runDisplacementFaceScan({
      src,
      triCount,
      userExcludedMask: new Uint8Array([0]),
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      mappingMode: 0,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals,
      posKey,
    })
    normalizeVec3Map(scan.smoothNrmMap)
    const cache = new Map<string, number>()
    const texture = {
      width: 1,
      height: 2,
      gray: new Uint8Array([
        0,
        255,
      ]),
    }
    const ctx: DisplacementVertexStepContext = {
      triUserExcluded: scan.triUserExcluded,
      excludedPosSet: scan.excludedPosSet,
      posKey,
      smoothNrmMap: scan.smoothNrmMap,
      triNormals,
      zoneAreaMap: scan.zoneAreaMap,
      maskedFracMap: scan.maskedFracMap,
      getCachedGray: (key, compute) => resolveCachedGray(cache, key, compute),
      sampleGray: (u, v) => sampleGrayBilinear(texture, u, v),
      computeUV: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
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

    const out = new Float32Array(src.length)
    let minDz = Infinity
    let maxDz = -Infinity
    for (let i = 0; i < src.length; i += 3) {
      const step = stepDisplacementVertex(src, i, ctx)
      out[i] = step.x
      out[i + 1] = step.y
      out[i + 2] = step.nz
      if (step.dz < minDz) minDz = step.dz
      if (step.dz > maxDz) maxDz = step.dz
    }

    expect(minDz).toBeCloseTo(-0.5, 8)
    expect(maxDz).toBeCloseTo(0.5, 8)
    expect(out[2]).toBeCloseTo(-0.5, 8)
    expect(out[5]).toBeCloseTo(-0.5, 8)
    expect(out[8]).toBeCloseTo(0.5, 8)
  })

  it('pins sealed-boundary vertices while non-boundary vertex can still move', () => {
    // Two triangles sharing edge (0,0,0)-(1,0,0); first face excluded.
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
    ])
    const triCount = 2
    const triNormals = new Float32Array([0, 0, 1, 0, 0, 1])
    const scan = runDisplacementFaceScan({
      src,
      triCount,
      userExcludedMask: new Uint8Array([1, 0]),
      topAngleLimit: 0,
      bottomAngleLimit: 0,
      mappingMode: 0,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals,
      posKey,
    })
    normalizeVec3Map(scan.smoothNrmMap)
    const cache = new Map<string, number>()
    const ctx: DisplacementVertexStepContext = {
      triUserExcluded: scan.triUserExcluded,
      excludedPosSet: scan.excludedPosSet,
      posKey,
      smoothNrmMap: scan.smoothNrmMap,
      triNormals,
      zoneAreaMap: scan.zoneAreaMap,
      maskedFracMap: scan.maskedFracMap,
      getCachedGray: (key, compute) => resolveCachedGray(cache, key, compute),
      sampleGray: () => 1,
      computeUV: (p) => ({ u: p.x, v: p.y }),
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
      amplitude: 1,
      symmetricDisplacement: true,
      bottomAngleLimit: 0,
      topAngleLimit: 0,
    }

    // Vertex 3 belongs to non-excluded face but lies on excluded boundary (same position as vertex 0).
    const sealed = stepDisplacementVertex(src, 9, ctx)
    // Vertex 5 is non-boundary vertex on non-excluded face.
    const free = stepDisplacementVertex(src, 15, ctx)
    expect(sealed.dz).toBe(0)
    expect(sealed.nz).toBeCloseTo(0, 8)
    expect(free.dz).toBeCloseTo(0.5, 8)
    expect(free.nz).toBeCloseTo(0.5, 8)
  })

  it('combines sealed pinning with masked top-limit clamping', () => {
    // Same shared-edge geometry; first face excluded to produce sealed boundary keys.
    const src = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
    ])
    const triNormals = new Float32Array([0, 0, 1, 0, 0, 1])
    const scan = runDisplacementFaceScan({
      src,
      triCount: 2,
      userExcludedMask: new Uint8Array([1, 0]),
      topAngleLimit: 90,
      bottomAngleLimit: 0,
      mappingMode: 0,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals,
      posKey,
    })
    normalizeVec3Map(scan.smoothNrmMap)
    const cache = new Map<string, number>()
    const ctx: DisplacementVertexStepContext = {
      triUserExcluded: scan.triUserExcluded,
      excludedPosSet: scan.excludedPosSet,
      posKey,
      smoothNrmMap: scan.smoothNrmMap,
      triNormals,
      zoneAreaMap: scan.zoneAreaMap,
      maskedFracMap: scan.maskedFracMap,
      getCachedGray: (key, compute) => resolveCachedGray(cache, key, compute),
      sampleGray: () => 1,
      computeUV: (p) => ({ u: p.x, v: p.y }),
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
      amplitude: 1,
      symmetricDisplacement: false,
      bottomAngleLimit: 0,
      topAngleLimit: 90,
    }

    // sealed boundary vertex on non-excluded face -> pinned by sealing.
    const sealed = stepDisplacementVertex(src, 9, ctx)
    // non-boundary vertex on non-excluded face -> fully masked under topAngleLimit=90, so dz attenuates to 0.
    const clamped = stepDisplacementVertex(src, 15, ctx)
    expect(sealed.dz).toBe(0)
    expect(sealed.nz).toBeCloseTo(0, 8)
    expect(clamped.dz).toBeCloseTo(0, 8)
    expect(clamped.nz).toBeCloseTo(0, 8)
  })

  it('combines sealed pinning with masked bottom-limit clamping (mirrored)', () => {
    // Mirrored winding to produce downward normals (nz < 0).
    const src = new Float32Array([
      0, 0, 0,
      0, 1, 0,
      1, 0, 0,
      0, 0, 0,
      1, 1, 0,
      1, 0, 0,
    ])
    const triNormals = new Float32Array([0, 0, -1, 0, 0, -1])
    const scan = runDisplacementFaceScan({
      src,
      triCount: 2,
      userExcludedMask: new Uint8Array([1, 0]),
      topAngleLimit: 0,
      bottomAngleLimit: 90,
      mappingMode: 0,
      mappingBlend: 0,
      seamBandWidth: 0.35,
      triNormals,
      posKey,
    })
    normalizeVec3Map(scan.smoothNrmMap)
    const cache = new Map<string, number>()
    const ctx: DisplacementVertexStepContext = {
      triUserExcluded: scan.triUserExcluded,
      excludedPosSet: scan.excludedPosSet,
      posKey,
      smoothNrmMap: scan.smoothNrmMap,
      triNormals,
      zoneAreaMap: scan.zoneAreaMap,
      maskedFracMap: scan.maskedFracMap,
      getCachedGray: (key, compute) => resolveCachedGray(cache, key, compute),
      sampleGray: () => 0,
      computeUV: (p) => ({ u: p.x, v: p.y }),
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
      amplitude: 1,
      symmetricDisplacement: true,
      bottomAngleLimit: 90,
      topAngleLimit: 0,
    }

    // sealed boundary vertex on non-excluded face -> pinned by sealing.
    const sealed = stepDisplacementVertex(src, 9, ctx)
    // non-boundary vertex on non-excluded face -> fully masked under bottomAngleLimit=90, so dz attenuates to 0.
    const clamped = stepDisplacementVertex(src, 12, ctx)
    expect(sealed.dz).toBe(0)
    expect(sealed.nz).toBeCloseTo(0, 8)
    expect(clamped.dz).toBeCloseTo(0, 8)
    expect(clamped.nz).toBeCloseTo(0, 8)
  })
})
