import { describe, expect, it } from 'vitest'
import { buildGcodePathPositions } from '../gcode/gcodePathPreview'

describe('carveraGcodePathPreview shim', () => {
  it('re-exports buildCarveraGcodePathPositions parity', async () => {
    const { buildCarveraGcodePathPositions } = await import('./carveraGcodePathPreview')
    const g = 'G90\nG1X1Y0Z0\nG2X2Y1I0.5J0'
    expect(buildCarveraGcodePathPositions(g).vertexCount).toBe(buildGcodePathPositions(g).vertexCount)
  })
})
