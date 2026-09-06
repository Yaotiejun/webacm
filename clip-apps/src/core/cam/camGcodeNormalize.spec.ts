import { describe, expect, it } from 'vitest'
import { normalizeCamGcodeText } from './camGcodeNormalize'

describe('camGcodeNormalize', () => {
  it('converts CRLF to LF and trims trailing blank runs', () => {
    expect(normalizeCamGcodeText('G1 X0\r\nG1 Y1\r\n\r\n\r\n')).toBe('G1 X0\nG1 Y1')
  })
})
