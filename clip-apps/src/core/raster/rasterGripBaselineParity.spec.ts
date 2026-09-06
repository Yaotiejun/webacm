import { describe, expect, it } from 'vitest'
import { buildGripBaselineParityReport, formatGripBaselineParityReport, matchesGripBaselineMesh } from './rasterGripBaselineParity'

describe('rasterGripBaselineParity', () => {
  it('detects grip baseline mesh vertex counts', () => {
    expect(matchesGripBaselineMesh(75_586, 960)).toBe(true)
    expect(matchesGripBaselineMesh(100, 100)).toBe(false)
  })

  it('formats parity report', () => {
    const r = buildGripBaselineParityReport(
      {
        paths: [{ points: [[0, 0, 0]] }],
        summary: { pathCount: 1, pointCount: 1, engine: 'webgpu' },
      },
      'planar',
      75_586,
      960,
    )
    expect(r.expectedChecksum).toBe(-838_563_865)
    expect(formatGripBaselineParityReport(r)).toContain('checksum=')
  })
})
