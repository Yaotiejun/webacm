import { describe, expect, it } from 'vitest'
import { runTexturizerJobWithLegacyMapping } from './texturizerJobLegacy'

describe('runTexturizerJobWithLegacyMapping', () => {
  it('runs legacy-mapping job path and emits staged progress', () => {
    const stages: string[] = []
    const result = runTexturizerJobWithLegacyMapping(
      {
        vertices: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        amplitude: 1,
        frequency: 1,
      },
      (stage) => stages.push(stage),
    )

    expect(result.kind).toBe('result')
    expect(result.vertices.length).toBeGreaterThan(0)
    expect(result.meta?.preTriCount).toBe(1)
    expect(result.meta?.postSubdivTriCount).toBe(1)
    expect(stages.includes('subdivision')).toBe(true)
    expect(stages.includes('displacement')).toBe(true)
    expect(stages.includes('decimation')).toBe(true)
    expect(stages.includes('finalize')).toBe(true)
  })
})
