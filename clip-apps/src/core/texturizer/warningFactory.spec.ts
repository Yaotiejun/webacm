import { describe, expect, it } from 'vitest'
import { createDecimationStrongerThanRequestedWarning, createSubdivSafetyCapHitWarning } from './warningFactory'
import { TEXTURIZER_WARNING_CODES, TEXTURIZER_WARNING_DETAIL_KEYS } from '@/types/texturizerWarnings'

describe('warningFactory', () => {
  it('creates subdiv safety warning with expected code/level/details keys', () => {
    const out = createSubdivSafetyCapHitWarning(1234, 2_000_000)
    expect(out.code).toBe(TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT)
    expect(out.level).toBe('error')
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.POST_SUBDIV_TRI_COUNT]).toBe(1234)
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.SUBDIV.SAFETY_TRIANGLES]).toBe(2_000_000)
  })

  it('omits subdiv details when inputs are non-finite/missing', () => {
    const out = createSubdivSafetyCapHitWarning(Number.NaN, Number.POSITIVE_INFINITY)
    expect(out.code).toBe(TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT)
    expect(out.details).toBeUndefined()
  })

  it('creates decimation warning with 4-digit ratio precision', () => {
    const out = createDecimationStrongerThanRequestedWarning(0.812345, 0.653219, 1200, 780)
    expect(out.code).toBe(TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED)
    expect(out.level).toBe('warning')
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.REQUESTED_RATIO]).toBe(0.8123)
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.KEPT_RATIO]).toBe(0.6532)
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.PRE_TRI_COUNT]).toBe(1200)
    expect(out.details?.[TEXTURIZER_WARNING_DETAIL_KEYS.DECIMATION.POST_TRI_COUNT]).toBe(780)
  })
})
