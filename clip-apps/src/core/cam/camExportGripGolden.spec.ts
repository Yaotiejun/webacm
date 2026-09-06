import { describe, expect, it } from 'vitest'
import { normalizeCamGcodeText } from './camGcodeNormalize'
import { collectCamExportGcode } from './camExportCollect'

/**
 * Golden-style contract: normalized collector output for a minimal synthetic `online` stream.
 * For byte-for-byte parity with `grip/grid-apps-master`, capture `cam_export` output there with the
 * same device/process JSON and replace `expectedBody` (or add a sibling fixture file later).
 */
describe('camExportGripGolden (synthetic)', () => {
  it('matches stable normalized shape for a fixed synthetic export stream', () => {
    const impl = (_print: unknown, online: (chunk: unknown) => void) => {
      online({ section: 'header' })
      online('; KiriCAM export stub\r\nG21\r\n')
      online({ section: 'op-0-rough' })
      online('G0 Z5\r\nG1 X10 Y0 F1000\r\n')
      online({ section: 'footer' })
      online('M5\r\n')
    }
    const { gcodeText, sections } = collectCamExportGcode(impl, {})
    expect(sections).toEqual(['header', 'op-0-rough', 'footer'])
    expect(gcodeText).toBe(`; KiriCAM export stub
G21
G0 Z5
G1 X10 Y0 F1000
M5`)
  })

  it('normalizes grip-style CRLF batches into a single LF document', () => {
    const batched = ';\r\nheader\r\n\r\nG1 X0\r\nG1 X1\r\n'
    expect(normalizeCamGcodeText(batched)).toBe(';\nheader\n\nG1 X0\nG1 X1')
  })
})
