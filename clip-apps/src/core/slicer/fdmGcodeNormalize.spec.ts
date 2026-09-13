import { describe, expect, it } from 'vitest'
import {
  dualExtruderStructuralDigest,
  normalizeFdmGcodeForMigrationFingerprint,
  normalizeFdmGcodeText,
  sha256HexUtf8,
} from './fdmGcodeNormalize'

describe('fdmGcodeNormalize', () => {
  it('normalizes CRLF and collapses blank lines', () => {
    expect(normalizeFdmGcodeText('G0 X0\r\n\r\n\r\nG1 X1\r')).toBe('G0 X0\n\nG1 X1')
  })

  it('strips volatile comments for fingerprint', () => {
    const raw = `; generated 2026-01-01\nM117 Printing\nT0\nG1 X1\nT1\nG1 X2\n`
    const fp = normalizeFdmGcodeForMigrationFingerprint(raw)
    expect(fp).not.toMatch(/generated/i)
    expect(fp).not.toMatch(/M117/)
    expect(fp).toContain('T0')
    expect(fp).toContain('T1')
  })

  it('dualExtruderStructuralDigest is order-stable for tool sequence', () => {
    const a = dualExtruderStructuralDigest('T0\nG1 X1\nT1\nG1 X2\nT0\nG1 X3\n')
    const b = dualExtruderStructuralDigest('T0\nG1 X9\nT1\nG1 X8\nT0\nG1 X7\n')
    expect(a).toBe(b)
    expect(a).toContain('seq=T0>T1>T0')
  })

  it('sha256HexUtf8 is stable', async () => {
    expect(await sha256HexUtf8('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })
})
