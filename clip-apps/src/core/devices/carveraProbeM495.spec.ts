import { describe, expect, it } from 'vitest'
import { bufferCarveraM495, buildCarveraM495, validateCarveraM495Options } from './carveraProbeM495'

describe('carveraProbeM495', () => {
  it('builds Z-only with paired O F', () => {
    expect(buildCarveraM495({ mode: 'z' })).toBe('M495X0Y0O0F0')
    expect(buildCarveraM495({ mode: 'z', startX: 10, startY: 5, offsetO: 0, offsetF: 0 })).toBe(
      'M495X10Y5O0F0',
    )
  })

  it('builds grid auto-level', () => {
    expect(
      buildCarveraM495({
        mode: 'grid',
        startX: 0,
        startY: 0,
        gridA: 100,
        gridB: 80,
        gridI: 3,
        gridJ: 3,
        clearanceH: 3,
      }),
    ).toBe('M495X0Y0O0F0A100B80I3J3H3')
  })

  it('builds margin + Z', () => {
    expect(
      buildCarveraM495({ mode: 'z', marginX: 100, marginY: 80 }),
    ).toBe('M495X0Y0C100D80O0F0')
  })

  it('builds 4th-axis O without F', () => {
    expect(buildCarveraM495({ mode: 'axis4' })).toBe('M495X0Y0O0P1')
  })

  it('builds none (start XY only)', () => {
    expect(buildCarveraM495({ mode: 'none', startX: 2, startY: 3 })).toBe('M495X2Y3')
  })

  it('bufferCarveraM495 prefixes buffer', () => {
    expect(bufferCarveraM495('M495X0Y0O0F0')).toBe('buffer M495X0Y0O0F0')
    expect(() => bufferCarveraM495('G0 X0')).toThrow(/M495/)
  })

  it('validate warns on tiny grid', () => {
    expect(validateCarveraM495Options({ mode: 'grid', gridI: 1, gridJ: 3 }).length).toBeGreaterThan(0)
  })
})
