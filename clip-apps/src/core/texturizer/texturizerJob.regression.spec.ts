import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'
import {
  resetTexturizerWarningRuleThresholdOverrides,
  setTexturizerWarningRuleThresholdOverrides,
} from './config'
import { TEXTURIZER_WARNING_CODES, TEXTURIZER_WARNING_DETAIL_KEYS } from '@/types/texturizerWarnings'

describe('texturizerJob regression', () => {
  it('keeps stable summary and key vertex z on fixed input', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]),
      amplitude: 1,
      frequency: 1,
      symmetricDisplacement: true,
      mappingMode: 0,
      subdivisionLevels: 0,
      decimationRatio: 1,
      texture: {
        width: 1,
        height: 2,
        gray: new Uint8Array([
          0,
          255,
        ]),
      },
    }

    const result = runTexturizerJob({
      req,
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })

    expect(result.kind).toBe('result')
    expect(result.summary.vertexCount).toBe(3)
    expect(result.summary.minDeltaZ).toBeCloseTo(-0.25, 8)
    expect(result.summary.maxDeltaZ).toBeCloseTo(0.25, 8)
    expect(result.vertices[2]).toBeCloseTo(-0.25, 8)
    expect(result.vertices[5]).toBeCloseTo(-0.25, 8)
    expect(result.vertices[8]).toBeCloseTo(0.25, 8)
    expect(result.meta?.preTriCount).toBe(1)
    expect(result.meta?.postSubdivTriCount).toBe(1)
    expect(result.meta?.postDecimateTriCount).toBe(1)
  })

  it('keeps sealed-boundary pinning under excluded-face + top-limit path', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
      ]),
      amplitude: 1,
      frequency: 1,
      symmetricDisplacement: false,
      mappingMode: 0,
      subdivisionLevels: 0,
      decimationRatio: 1,
      exclusionMode: 'exclude' as const,
      excludedFaces: [0],
      topAngleLimit: 90,
      texture: {
        width: 1,
        height: 2,
        gray: new Uint8Array([
          0,
          255,
        ]),
      },
    }

    const result = runTexturizerJob({
      req,
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })

    // Vertex index 3 is on non-excluded triangle but position-shared with excluded boundary.
    expect(result.vertices[11]).toBeCloseTo(0, 8)
    // With top-angle mask active in this setup, non-boundary vertex remains clamped at base plane.
    expect(result.vertices[17]).toBeCloseTo(0, 8)
    expect(result.summary.minDeltaZ).toBeCloseTo(0, 8)
    expect(result.summary.maxDeltaZ).toBeCloseTo(0, 8)
  })

  it('keeps sealed-boundary pinning under excluded-face + bottom-limit mirrored path', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        0, 1, 0,
        1, 0, 0,
        0, 0, 0,
        1, 1, 0,
        1, 0, 0,
      ]),
      amplitude: 1,
      frequency: 1,
      symmetricDisplacement: true,
      mappingMode: 0,
      subdivisionLevels: 0,
      decimationRatio: 1,
      exclusionMode: 'exclude' as const,
      excludedFaces: [0],
      bottomAngleLimit: 90,
      texture: {
        width: 1,
        height: 2,
        gray: new Uint8Array([
          0,
          255,
        ]),
      },
    }

    const result = runTexturizerJob({
      req,
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })

    // Vertex index 3 is boundary-shared with excluded face and should be sealed.
    expect(result.vertices[11]).toBeCloseTo(0, 8)
    // Non-boundary vertex on mirrored bottom-angle setup is also clamped at base plane.
    expect(result.vertices[14]).toBeCloseTo(0, 8)
    expect(result.summary.minDeltaZ).toBeCloseTo(0, 8)
    expect(result.summary.maxDeltaZ).toBeCloseTo(0, 8)
  })

  it('keeps stable tri-count and summary invariants with subdivision+decimation', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        2, 0, 0,
        0, 2, 0,
      ]),
      amplitude: 0.8,
      frequency: 2,
      symmetricDisplacement: true,
      mappingMode: 0,
      subdivisionLevels: 1,
      decimationRatio: 0.6,
      texture: {
        width: 2,
        height: 2,
        gray: new Uint8Array([
          0, 255,
          255, 0,
        ]),
      },
    }
    const progress: string[] = []
    const result = runTexturizerJob({
      req,
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: p.x * 0.5, v: p.y * 0.5 }),
      onProgress: (stage) => progress.push(stage),
    })

    expect(result.kind).toBe('result')
    expect(result.meta?.preTriCount).toBe(1)
    expect((result.meta?.postSubdivTriCount ?? 0) >= 1).toBe(true)
    expect((result.meta?.postDecimateTriCount ?? 0) >= 1).toBe(true)
    expect((result.meta?.postDecimateTriCount ?? 0) <= (result.meta?.postSubdivTriCount ?? 0)).toBe(true)
    expect(result.summary.vertexCount).toBe(result.vertices.length / 3)
    expect(result.summary.minDeltaZ <= result.summary.maxDeltaZ).toBe(true)
    expect(progress.includes('subdivision')).toBe(true)
    expect(progress.includes('displacement')).toBe(true)
    expect(progress.includes('decimation')).toBe(true)
    expect(progress.includes('finalize')).toBe(true)
  })

  it('emits decimation metadata on stronger decimation path', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        2, 0, 0,
        0, 2, 0,
      ]),
      amplitude: 0.5,
      frequency: 1,
      symmetricDisplacement: false,
      mappingMode: 0,
      subdivisionLevels: 2,
      decimationRatio: 0.3,
      texture: {
        width: 2,
        height: 2,
        gray: new Uint8Array([
          0, 255,
          255, 0,
        ]),
      },
    }

    const result = runTexturizerJob({
      req,
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: p.x * 0.5, v: p.y * 0.5 }),
    })

    expect(result.meta?.decimationEngine).toBeDefined()
    expect(result.meta?.decimationSearchMeta).toBeDefined()
    expect((result.meta?.postDecimateTriCount ?? 0) <= (result.meta?.postSubdivTriCount ?? 0)).toBe(true)
    expect(result.summary.vertexCount).toBe(result.vertices.length / 3)
  })

  it('is deterministic across repeated runs with same input', () => {
    const req = {
      vertices: new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
      ]),
      amplitude: 0.7,
      frequency: 1.5,
      symmetricDisplacement: true,
      mappingMode: 0,
      subdivisionLevels: 1,
      decimationRatio: 0.8,
      texture: {
        width: 2,
        height: 2,
        gray: new Uint8Array([
          0, 255,
          255, 0,
        ]),
      },
    }
    const computeUvLegacy = (p: { x: number; y: number; z: number }) => ({ u: p.x * 0.5, v: p.y * 0.5 })

    const a = runTexturizerJob({ req, defaultCubicMode: 6, computeUvLegacy })
    const b = runTexturizerJob({ req, defaultCubicMode: 6, computeUvLegacy })

    expect(a.summary.minDeltaZ).toBeCloseTo(b.summary.minDeltaZ, 8)
    expect(a.summary.maxDeltaZ).toBeCloseTo(b.summary.maxDeltaZ, 8)
    expect(a.vertices.length).toBe(b.vertices.length)
    for (let i = 0; i < a.vertices.length; i += 1) {
      expect(a.vertices[i]).toBeCloseTo(b.vertices[i] ?? 0, 8)
    }
    expect(a.meta?.postDecimateTriCount).toBe(b.meta?.postDecimateTriCount)
  })

  it('keeps decimation warning semantics aligned with meta tri counts', () => {
    setTexturizerWarningRuleThresholdOverrides({
      decimationRatioWarnMin: 0,
      decimationKeptRatioWarnMax: 1.1,
    })
    try {
      const req = {
        vertices: new Float32Array([
          0, 0, 0,
          2, 0, 0,
          0, 2, 0,
        ]),
        amplitude: 0.6,
        frequency: 1.2,
        symmetricDisplacement: false,
        mappingMode: 0,
        subdivisionLevels: 2,
        decimationRatio: 0.9,
        texture: {
          width: 2,
          height: 2,
          gray: new Uint8Array([
            0, 255,
            255, 0,
          ]),
        },
      }

      const result = runTexturizerJob({
        req,
        defaultCubicMode: 6,
        computeUvLegacy: (p) => ({ u: p.x * 0.5, v: p.y * 0.5 }),
      })

      const warning = result.warnings?.find((w) => w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED)
      expect(warning).toBeDefined()
      expect(warning?.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.REQUESTED_RATIO]).toBeCloseTo(0.9, 4)
      expect(warning?.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.PRE_TRI_COUNT]).toBe(result.meta?.postSubdivTriCount)
      expect(warning?.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.POST_TRI_COUNT]).toBe(result.meta?.postDecimateTriCount)
    } finally {
      resetTexturizerWarningRuleThresholdOverrides()
    }
  })

  it('does not emit decimation warning when ratio gate is not met', () => {
    setTexturizerWarningRuleThresholdOverrides({
      decimationRatioWarnMin: 0.95,
      decimationKeptRatioWarnMax: 1.1,
    })
    try {
      const req = {
        vertices: new Float32Array([
          0, 0, 0,
          2, 0, 0,
          0, 2, 0,
        ]),
        amplitude: 0.6,
        frequency: 1.2,
        symmetricDisplacement: false,
        mappingMode: 0,
        subdivisionLevels: 2,
        decimationRatio: 0.9,
        texture: {
          width: 2,
          height: 2,
          gray: new Uint8Array([
            0, 255,
            255, 0,
          ]),
        },
      }

      const result = runTexturizerJob({
        req,
        defaultCubicMode: 6,
        computeUvLegacy: (p) => ({ u: p.x * 0.5, v: p.y * 0.5 }),
      })

      const warning = result.warnings?.find((w) => w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED)
      expect(warning).toBeUndefined()
    } finally {
      resetTexturizerWarningRuleThresholdOverrides()
    }
  })
})
