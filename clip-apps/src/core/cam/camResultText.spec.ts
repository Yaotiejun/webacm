import { describe, expect, it } from 'vitest'
import { formatCamResultText } from './camResultText'
import gripFixtureGcode from './fixtures/grip-cam-export-sample.gcode.txt?raw'
import type { CamJobResult } from '@/types/camJob'

describe('camResultText', () => {
  it('includes gcode motion stats when gcode present', () => {
    const result: CamJobResult = {
      backend: 'kiri-cam',
      profileName: 'p',
      deviceName: 'd',
      processName: 'proc',
      stockSize: null,
      zSettings: { anchor: null, bottom: null, clearance: null },
      summary: {
        opCount: 1,
        toolCountUsed: 1,
        estimatedTotalPasses: 1,
        estimatedTotalPathSegments: 1,
        estimatedMachiningTimeMinutes: 1,
      },
      perOp: [],
      notes: [],
      gcodeText: '; c\nG0 X0\nG1 X1\n',
    }
    const text = formatCamResultText(result)
    expect(text).toContain('gcode.motion')
    expect(text).toContain('G0=1')
    expect(text).toContain('G1=1')
    expect(text).toContain('gripFixture.motionMatch=0')
  })

  it('reports section match when motion matches grip fixture', () => {
    const result: CamJobResult = {
      backend: 'kiri-cam',
      profileName: 'p',
      deviceName: 'd',
      processName: 'proc',
      stockSize: null,
      zSettings: { anchor: null, bottom: null, clearance: null },
      summary: {
        opCount: 2,
        toolCountUsed: 1,
        estimatedTotalPasses: 1,
        estimatedTotalPathSegments: 1,
        estimatedMachiningTimeMinutes: 1,
      },
      perOp: [],
      notes: ['legacy cam_export sections: header, op-0-rough, footer'],
      gcodeText: gripFixtureGcode,
    }
    const text = formatCamResultText(result)
    expect(text).toContain('gripFixture.motionMatch=1')
    expect(text).toContain('gripFixture.zDepthMatch=1')
    expect(text).toContain('gripFixture.placeholderPassesTighten=1')
    expect(text).toContain('gcode.zDepth min=2 max=10')
    expect(text).toContain('gripFixture.sectionsMatch=1')
  })
})
