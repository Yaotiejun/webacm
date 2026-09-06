import { describe, expect, it } from 'vitest'
import { collectCamExportGcode } from './camExportCollect'

describe('camExportCollect', () => {
  it('collects string chunks and section markers like legacy cam_export', () => {
    const fakeExport = (_print: unknown, online: (chunk: unknown) => void) => {
      online({ section: 'header' })
      online('G21\r\nG90\r\n')
      online('G0 X1 Y2')
    }
    const out = collectCamExportGcode(fakeExport, {})
    expect(out.sections).toEqual(['header'])
    expect(out.gcodeText).toBe('G21\nG90\nG0 X1 Y2')
  })

  it('ignores empty string chunks and records multiple sections', () => {
    const fakeExport = (_print: unknown, online: (chunk: unknown) => void) => {
      online('')
      online({ section: 'header' })
      online({ section: 'footer' })
      online('M5\r\n')
    }
    const out = collectCamExportGcode(fakeExport, {})
    expect(out.sections).toEqual(['header', 'footer'])
    expect(out.gcodeText).toBe('M5')
  })

  it('collects a single array chunk as newline-joined lines', () => {
    const fakeExport = (_print: unknown, online: (chunk: unknown) => void) => {
      online({ section: 'op-0-rough' })
      online(['G21', 'G90'])
    }
    const out = collectCamExportGcode(fakeExport, {})
    expect(out.sections).toEqual(['op-0-rough'])
    expect(out.gcodeText).toBe('G21\nG90')
  })
})
