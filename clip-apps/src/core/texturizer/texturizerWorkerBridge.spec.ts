import { describe, expect, it } from 'vitest'
import { runTexturizerWorkerBridge } from './texturizerWorkerBridge'

describe('runTexturizerWorkerBridge', () => {
  it('bridges request to legacy-mapping job and preserves progress callback', () => {
    const stages: string[] = []
    const out = runTexturizerWorkerBridge({
      req: {
        vertices: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
        ]),
        amplitude: 1,
        frequency: 1,
      },
      onProgress: (stage) => stages.push(stage),
    })
    expect(out.kind).toBe('result')
    expect(out.vertices.length).toBeGreaterThan(0)
    expect(stages.includes('subdivision')).toBe(true)
    expect(stages.includes('displacement')).toBe(true)
    expect(stages.includes('decimation')).toBe(true)
    expect(stages.includes('finalize')).toBe(true)
  })
})
