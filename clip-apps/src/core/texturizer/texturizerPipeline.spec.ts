import { describe, expect, it } from 'vitest'
import { runTexturizerPipeline } from './texturizerPipeline'

describe('runTexturizerPipeline', () => {
  it('runs full pipeline and returns result payload', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const cache = new Map<string, number>()
    const events: string[] = []
    const result = runTexturizerPipeline({
      vertices,
      excludedFaces: [],
      exclusionMode: 'exclude',
      subdivisionLevels: 0,
      decimationRatio: 1,
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
      getCachedGray: (k, compute) => {
        const v = cache.get(k)
        if (v != null) return v
        const nv = compute()
        cache.set(k, nv)
        return nv
      },
      cubicMappingMode: 6,
      amplitude: 1,
      symmetricDisplacement: false,
      onProgress: (stage) => events.push(stage),
    })
    expect(result.kind).toBe('result')
    expect(result.vertices.length).toBeGreaterThan(0)
    expect(result.meta?.postSubdivTriCount).toBe(1)
    const stageOrder = Array.from(new Set(events))
    expect(stageOrder).toEqual(['subdivision', 'displacement', 'decimation', 'finalize'])
    expect(events.includes('subdivision')).toBe(true)
    expect(events.includes('displacement')).toBe(true)
    expect(events.includes('decimation')).toBe(true)
    expect(events.includes('finalize')).toBe(true)
  })

  it('emits bounded and stage-ordered progress events', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      2, 0, 0,
      0, 2, 0,
    ])
    const cache = new Map<string, number>()
    const stageOrder = ['subdivision', 'displacement', 'decimation', 'finalize'] as const
    const stageEvents = new Map<string, number[]>()
    let lastStageIdx = -1
    runTexturizerPipeline({
      vertices,
      excludedFaces: [],
      exclusionMode: 'exclude',
      subdivisionLevels: 1,
      decimationRatio: 0.7,
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
      getCachedGray: (k, compute) => {
        const v = cache.get(k)
        if (v != null) return v
        const nv = compute()
        cache.set(k, nv)
        return nv
      },
      cubicMappingMode: 6,
      amplitude: 1,
      symmetricDisplacement: false,
      onProgress: (stage, progress) => {
        const idx = stageOrder.indexOf(stage)
        expect(idx).toBeGreaterThanOrEqual(0)
        expect(progress).toBeGreaterThanOrEqual(0)
        expect(progress).toBeLessThanOrEqual(1)
        expect(idx).toBeGreaterThanOrEqual(lastStageIdx)
        lastStageIdx = idx
        const arr = stageEvents.get(stage) ?? []
        arr.push(progress)
        stageEvents.set(stage, arr)
      },
    })

    for (const stage of stageOrder) {
      expect((stageEvents.get(stage)?.length ?? 0) > 0).toBe(true)
    }
  })
})
