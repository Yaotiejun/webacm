import { describe, expect, it } from 'vitest'
import { collectFdmExportGcode } from './fdmExportCollect'

describe('fdmExportCollect', () => {
  it('joins online string batches like legacy fdm_export', () => {
    const fakeExport = (
      _print: unknown,
      online: (chunk: unknown) => void,
      ondone?: (err?: unknown) => void,
    ) => {
      online('G21\nG90')
      online('G1 X1 E0.1')
      ondone?.()
    }
    const out = collectFdmExportGcode(fakeExport, {})
    expect(out.gcodeText).toBe('G21\nG90\nG1 X1 E0.1')
    expect(out.lineEstimate).toBe(3)
  })

  it('ignores empty chunks', () => {
    const fakeExport = (_print: unknown, online: (chunk: unknown) => void) => {
      online('')
      online(['M104 S0', 'M84'])
    }
    const out = collectFdmExportGcode(fakeExport, {})
    expect(out.gcodeText).toBe('M104 S0\nM84')
  })
})
