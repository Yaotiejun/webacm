import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'
import { texturizerVertexZStats } from './texturizerResultVertexStats'
import { GRIP_STL_TEXTURIZER_UI_DEFAULTS } from './texturizerGripDefaults'
import {
  TEXTURIZER_GRIP_GOLDEN_CUBIC,
  TEXTURIZER_GRIP_GOLDEN_SUBDIV1,
  TEXTURIZER_GRIP_GOLDEN_SUBDIV2,
  TEXTURIZER_GRIP_GOLDEN_TRIANGLE,
  TEXTURIZER_GRIP_GOLDEN_TRIPLANAR,
} from './texturizerGripGolden'

describe('texturizerGripGolden', () => {
  it('fixed triangle mesh matches pinned golden summary', () => {
    const g = TEXTURIZER_GRIP_GOLDEN_TRIANGLE
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 0,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    expect(result.summary.vertexCount).toBe(g.vertexCount)
    expect(result.summary.minDeltaZ).toBeCloseTo(g.minDeltaZ, 8)
    expect(result.summary.maxDeltaZ).toBeCloseTo(g.maxDeltaZ, 8)
    expect(result.vertices[2]).toBeCloseTo(g.vertexZ[0], 8)
    expect(result.vertices[5]).toBeCloseTo(g.vertexZ[1], 8)
    expect(result.vertices[8]).toBeCloseTo(g.vertexZ[2], 8)
    expect(result.meta?.preTriCount).toBe(g.preTriCount)
    expect(result.meta?.postSubdivTriCount).toBe(g.postSubdivTriCount)
    expect(result.meta?.postDecimateTriCount).toBe(g.postDecimateTriCount)
    const orig = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const stats = texturizerVertexZStats(result.vertices, orig)
    expect(stats.minDeltaZ).toBeCloseTo(g.minDeltaZ, 8)
    expect(stats.maxDeltaZ).toBeCloseTo(g.maxDeltaZ, 8)
  })

  it('subdivision level 1 on fixed triangle matches pinned golden', () => {
    const g = TEXTURIZER_GRIP_GOLDEN_SUBDIV1
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 1,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    expect(result.summary.vertexCount).toBe(g.vertexCount)
    expect(result.meta?.preTriCount).toBe(g.preTriCount)
    expect(result.meta?.postSubdivTriCount).toBe(g.postSubdivTriCount)
    expect(result.meta?.postDecimateTriCount).toBe(g.postDecimateTriCount)
  })

  it('subdivision level 2 on fixed triangle matches pinned golden', () => {
    const g = TEXTURIZER_GRIP_GOLDEN_SUBDIV2
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 2,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    expect(result.summary.vertexCount).toBe(g.vertexCount)
    expect(result.meta?.preTriCount).toBe(g.preTriCount)
    expect(result.meta?.postSubdivTriCount).toBe(g.postSubdivTriCount)
    expect(result.meta?.postDecimateTriCount).toBe(g.postDecimateTriCount)
  })

  it('grip UI triplanar defaults match pinned golden on fixed triangle', () => {
    const g = TEXTURIZER_GRIP_GOLDEN_TRIPLANAR
    const d = GRIP_STL_TEXTURIZER_UI_DEFAULTS
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: d.amplitude,
        frequency: d.frequency,
        symmetricDisplacement: d.symmetricDisplacement,
        mappingMode: d.mappingMode,
        mappingBlend: d.mappingBlend,
        seamBandWidth: d.seamBandWidth,
        scaleU: d.scaleU,
        scaleV: d.scaleV,
        offsetU: d.offsetU,
        offsetV: d.offsetV,
        rotationDeg: d.rotationDeg,
        subdivisionLevels: d.subdivisionLevels,
        decimationRatio: d.decimationRatio,
        texture: { width: 2, height: 2, gray: new Uint8Array([128, 128, 128, 128]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.summary.vertexCount).toBe(g.vertexCount)
    expect(result.summary.minDeltaZ).toBeCloseTo(g.minDeltaZ, 8)
    expect(result.summary.maxDeltaZ).toBeCloseTo(g.maxDeltaZ, 8)
    expect(result.vertices[2]).toBeCloseTo(g.vertexZ[0], 6)
    expect(result.vertices[5]).toBeCloseTo(g.vertexZ[1], 6)
    expect(result.vertices[8]).toBeCloseTo(g.vertexZ[2], 6)
  })

  it('grip cubic mode 6 matches pinned golden on fixed triangle', () => {
    const g = TEXTURIZER_GRIP_GOLDEN_CUBIC
    const d = GRIP_STL_TEXTURIZER_UI_DEFAULTS
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        amplitude: d.amplitude,
        frequency: d.frequency,
        symmetricDisplacement: d.symmetricDisplacement,
        mappingMode: 6,
        mappingBlend: d.mappingBlend,
        seamBandWidth: d.seamBandWidth,
        scaleU: d.scaleU,
        scaleV: d.scaleV,
        offsetU: d.offsetU,
        offsetV: d.offsetV,
        rotationDeg: d.rotationDeg,
        subdivisionLevels: d.subdivisionLevels,
        decimationRatio: d.decimationRatio,
        texture: { width: 2, height: 2, gray: new Uint8Array([128, 128, 128, 128]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.summary.maxDeltaZ).toBeCloseTo(g.maxDeltaZ, 8)
    expect(result.vertices[8]).toBeCloseTo(g.vertexZ[2], 6)
  })
})
