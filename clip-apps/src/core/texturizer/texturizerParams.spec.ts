import { describe, expect, it } from 'vitest'
import { resolveTexturizerParams } from './texturizerParams'

describe('resolveTexturizerParams', () => {
  it('applies defaults and frequency clamp', () => {
    const out = resolveTexturizerParams(
      {
        vertices: new Float32Array(),
        amplitude: 2,
        frequency: 0,
      },
      6,
    )
    expect(out.mappingMode).toBe(6)
    expect(out.uvFrequency).toBe(1)
    expect(out.seamBandWidth).toBe(0.5)
    expect(out.exclusionMode).toBe('exclude')
  })

  it('keeps explicit values', () => {
    const out = resolveTexturizerParams(
      {
        vertices: new Float32Array(),
        amplitude: 1.5,
        frequency: 4,
        mappingMode: 2,
        scaleU: 3,
        exclusionMode: 'include',
        excludedFaces: [1, 2],
      },
      6,
    )
    expect(out.mappingMode).toBe(2)
    expect(out.uvFrequency).toBe(4)
    expect(out.scaleU).toBe(3)
    expect(out.exclusionMode).toBe('include')
    expect(out.excludedFaces).toEqual([1, 2])
  })

  it('normalizes excluded faces as non-negative deduped integers', () => {
    const out = resolveTexturizerParams(
      {
        vertices: new Float32Array(),
        amplitude: 1,
        frequency: 1,
        excludedFaces: [1.9, 1, -1, 4, Number.NaN, 4],
      },
      6,
    )
    expect(out.excludedFaces).toEqual([1, 4])
  })

  it('clamps subdivision levels and decimation ratio', () => {
    const low = resolveTexturizerParams(
      {
        vertices: new Float32Array(),
        amplitude: 1,
        frequency: 1,
        subdivisionLevels: -2,
        decimationRatio: 0.001,
      },
      6,
    )
    expect(low.subdivisionLevels).toBe(0)
    expect(low.decimationRatio).toBe(0.05)

    const high = resolveTexturizerParams(
      {
        vertices: new Float32Array(),
        amplitude: 1,
        frequency: 1,
        subdivisionLevels: 9.9,
        decimationRatio: 9,
      },
      6,
    )
    expect(high.subdivisionLevels).toBe(3)
    expect(high.decimationRatio).toBe(1)
  })
})
