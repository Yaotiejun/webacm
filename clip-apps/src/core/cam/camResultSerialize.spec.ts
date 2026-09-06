import { describe, expect, it } from 'vitest'
import type { CamJobResult } from '@/types/camJob'
import { extractCamExportSectionsLine, toCamJobResultDisplayJson } from './camResultSerialize'

function baseResult(over: Partial<CamJobResult> = {}): CamJobResult {
  return {
    backend: 'kiri-cam',
    profileName: 'p',
    deviceName: 'D',
    processName: 'P',
    stockSize: null,
    zSettings: { anchor: null, bottom: null, clearance: null },
    summary: {
      opCount: 1,
      toolCountUsed: 1,
      estimatedTotalPasses: 1,
      estimatedTotalPathSegments: 10,
      estimatedMachiningTimeMinutes: 0.1,
    },
    perOp: [],
    notes: [],
    fallback: null,
    ...over,
  }
}

describe('camResultSerialize', () => {
  it('extractCamExportSectionsLine reads camEngine note', () => {
    expect(
      extractCamExportSectionsLine(['legacy cam_export enabled', 'legacy cam_export sections: header, op-0-rough']),
    ).toBe('header, op-0-rough')
  })

  it('toCamJobResultDisplayJson keeps small gcode inline', () => {
    const r = baseResult({ gcodeText: 'G21\nG90\n' })
    const out = toCamJobResultDisplayJson(r) as CamJobResult
    expect(out.gcodeText).toBe('G21\nG90\n')
  })

  it('toCamJobResultDisplayJson replaces huge gcode with gcodeSummary', () => {
    const big = 'G1 X0\n'.repeat(499) + 'G1 X0'
    const r = baseResult({ gcodeText: big })
    const out = toCamJobResultDisplayJson(r) as { gcodeSummary?: { lineCount: number; preview: string } }
    expect(out.gcodeSummary?.lineCount).toBe(500)
    expect('gcodeText' in out && (out as any).gcodeText).toBeFalsy()
    expect(out.gcodeSummary?.preview).toContain('G1 X0')
  })
})
