import { describe, expect, it } from 'vitest'
import { buildTexturizerProgressEvent } from './progressEvent'

describe('buildTexturizerProgressEvent', () => {
  it('clamps progress into [0,1]', () => {
    expect(buildTexturizerProgressEvent('subdivision', -1).progress).toBe(0)
    expect(buildTexturizerProgressEvent('decimation', 2).progress).toBe(1)
  })

  it('builds progress payload shape', () => {
    const out = buildTexturizerProgressEvent('finalize', 0.4, 'ok')
    expect(out).toEqual({
      kind: 'progress',
      stage: 'finalize',
      progress: 0.4,
      message: 'ok',
    })
  })
})
