import { describe, expect, it } from 'vitest'
import {
  MAKERA_CARVERA_MACHINE_ENVELOPE,
  formatMachineEnvelopeHint,
} from './carveraMachineEnvelope'

describe('carveraMachineEnvelope', () => {
  it('matches grip Makera.Carvera bed and Z travel', () => {
    expect(MAKERA_CARVERA_MACHINE_ENVELOPE.widthMm).toBe(360)
    expect(MAKERA_CARVERA_MACHINE_ENVELOPE.depthMm).toBe(240)
    expect(MAKERA_CARVERA_MACHINE_ENVELOPE.maxHeightMm).toBe(150)
  })

  it('formats hint for UI', () => {
    expect(formatMachineEnvelopeHint(MAKERA_CARVERA_MACHINE_ENVELOPE)).toBe('360×240×150 mm')
  })
})
