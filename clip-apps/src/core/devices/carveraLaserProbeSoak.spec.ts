import { describe, expect, it } from 'vitest'
import { evaluateCarveraLaserProbeSoak } from './carveraLaserProbeSoak'

describe('carveraLaserProbeSoak', () => {
  it('passes when L and W appear in status polls', () => {
    const r = evaluateCarveraLaserProbeSoak([
      {
        line: '<Idle|MPos:0,0,0|L:10,200,100,0|W:3.25|A:1|H:0|Buf:5>',
        parsed: null,
        at: 0,
      },
    ])
    expect(r.ok).toBe(true)
    expect(r.sawLaser).toBe(true)
    expect(r.sawProbe).toBe(true)
    expect(r.sawSetup).toBe(true)
    expect(r.sawHalt).toBe(true)
    expect(r.lastProbeVoltage).toBe(3.25)
  })

  it('fails when probe W is absent', () => {
    const r = evaluateCarveraLaserProbeSoak([
      { line: '<Idle|MPos:0,0,0|L:0,255,100|Buf:1>', parsed: null, at: 0 },
    ])
    expect(r.ok).toBe(false)
    expect(r.errors.some((e) => e.includes('probe'))).toBe(true)
  })
})
