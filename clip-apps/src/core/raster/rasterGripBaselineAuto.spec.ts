import { describe, expect, it } from 'vitest'
import { tryFormatAutoGripBaselineParity, tryGripBaselineParityBundle } from './rasterGripBaselineAuto'

describe('tryFormatAutoGripBaselineParity', () => {
  it('returns null for non-baseline mesh', () => {
    expect(
      tryFormatAutoGripBaselineParity(
        { paths: [], summary: { pathCount: 0, pointCount: 0 } },
        'planar',
        100,
        100,
      ),
    ).toBeNull()
  })

  it('returns report for baseline mesh counts', () => {
    const s = tryFormatAutoGripBaselineParity(
      { paths: [{ points: [[0, 0, 0]] }], summary: { pathCount: 1, pointCount: 1 } },
      'planar',
      75_586,
      960,
    )
    expect(s).toContain('[auto grip baseline]')
    expect(s).toContain('checksum=')
  })

  it('bundle exposes report for E2E publish', () => {
    const b = tryGripBaselineParityBundle(
      { paths: [{ points: [[0, 0, 0]] }], summary: { pathCount: 1, pointCount: 1 } },
      'planar',
      75_586,
      960,
    )
    expect(b?.report.checksumMatch).toBeTypeOf('boolean')
    expect(b?.text).toContain('[auto grip baseline]')
  })
})
