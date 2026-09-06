import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'

describe('runTexturizerJob', () => {
  it('runs full texturizer job and emits staged progress', () => {
    const stages: string[] = []
    const result = runTexturizerJob({
      req: {
        vertices: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        amplitude: 1,
        frequency: 1,
      },
      defaultCubicMode: 6,
      computeUvLegacy: () => ({ u: 0, v: 0 }),
      onProgress: (stage) => stages.push(stage),
    })
    expect(result.kind).toBe('result')
    expect(result.vertices.length).toBeGreaterThan(0)
    expect(stages.includes('subdivision')).toBe(true)
    expect(stages.includes('displacement')).toBe(true)
    expect(stages.includes('decimation')).toBe(true)
    expect(stages.includes('finalize')).toBe(true)
  })
})
