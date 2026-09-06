import { describe, expect, it } from 'vitest'
import { runFinalizePass } from './finalizePass'

describe('runFinalizePass', () => {
  it('builds result and post-decimate tri count', () => {
    const vertices = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ])
    const out = runFinalizePass({
      vertices,
      minDz: -0.1,
      maxDz: 0.3,
      preTriCount: 2,
      postSubdivTriCount: 2,
      subdivSafetyCapHit: false,
      decimationRatio: 1,
      subdivisionMs: 1.111,
      displacementMs: 2.222,
      decimationMs: 3.333,
      totalMs: 6.666,
      decimationEngine: 'none',
    })
    expect(out.postDecimateTriCount).toBe(1)
    expect(out.result.summary.vertexCount).toBe(3)
    expect(out.result.meta?.stageTimingsMs?.total).toBe(6.67)
    expect(out.result.meta?.decimationEngine).toBe('none')
  })
})
