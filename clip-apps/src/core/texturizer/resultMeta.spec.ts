import { describe, expect, it } from 'vitest'
import { buildStageTimingsMs, buildTexturizeResult, buildTexturizeSummary } from './resultMeta'

describe('resultMeta helpers', () => {
  it('builds rounded stage timings', () => {
    const out = buildStageTimingsMs({
      subdivisionMs: 1.234,
      displacementMs: 2.345,
      decimationMs: 3.456,
      totalMs: 7.035,
    })
    expect(out).toEqual({
      subdivision: 1.23,
      displacement: 2.35,
      decimation: 3.46,
      total: 7.04,
    })
  })

  it('builds texturize summary from vertices and dz range', () => {
    const out = buildTexturizeSummary(new Float32Array(9), -0.2, 0.8)
    expect(out).toEqual({
      vertexCount: 3,
      minDeltaZ: -0.2,
      maxDeltaZ: 0.8,
    })
  })

  it('builds final texturize result payload', () => {
    const stageTimingsMs = buildStageTimingsMs({
      subdivisionMs: 1,
      displacementMs: 2,
      decimationMs: 3,
      totalMs: 6,
    })
    const out = buildTexturizeResult({
      vertices: new Float32Array(9),
      minDz: -0.1,
      maxDz: 0.2,
      warnings: [],
      preTriCount: 3,
      postSubdivTriCount: 6,
      postDecimateTriCount: 4,
      subdivSafetyCapHit: false,
      stageTimingsMs,
      decimationEngine: 'cluster',
      decimationSearchMeta: {
        expansionLimit: 6,
        binaryItersPlanned: 6,
        binaryItersExecuted: 3,
        stagnationLimit: 2,
        earlyStopReason: 'target-close',
        finalDiff: 1,
      },
    })
    expect(out.kind).toBe('result')
    expect(out.summary.vertexCount).toBe(3)
    expect(out.meta?.postDecimateTriCount).toBe(4)
    expect(out.meta?.decimationEngine).toBe('cluster')
  })
})
