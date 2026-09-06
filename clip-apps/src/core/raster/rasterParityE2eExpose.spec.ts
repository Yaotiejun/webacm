import { describe, expect, it } from 'vitest'
import { buildGripBaselineParityReport } from './rasterGripBaselineParity'
import { publishRasterParityE2e } from './rasterParityE2eExpose'

describe('rasterParityE2eExpose', () => {
  it('publishes snapshot on window in jsdom', () => {
    const report = buildGripBaselineParityReport(
      {
        paths: [{ points: [[0, 0, 0]] }],
        summary: { pathCount: 1, pointCount: 1, gripBridge: true },
      },
      'planar',
      75_586,
      960,
    )
    publishRasterParityE2e(report, 'test')
    expect(window.__shapeCamRasterParity?.checksumMatch).toBe(report.checksumMatch)
    publishRasterParityE2e(null)
    expect(window.__shapeCamRasterParity).toBeUndefined()
  })
})
