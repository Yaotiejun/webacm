import { describe, expect, it } from 'vitest'
import { buildRuntimeWarnings } from './warningRuntime'
import { TEXTURIZER_WARNING_CODES } from '@/types/texturizerWarnings'
import { getTexturizerConfig } from './config'

describe('warningRuntime.buildRuntimeWarnings', () => {
  const cfg = getTexturizerConfig()

  it('emits subdiv safety warning when cap is hit', () => {
    const out = buildRuntimeWarnings({
      subdivSafetyCapHit: true,
      postSubdivTriCount: 1500,
      postDecimateTriCount: 1400,
      decimationRatio: 1,
    })
    expect(out.some((w) => w.code === TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT)).toBe(true)
  })

  it('emits decimation warning only when threshold condition is met', () => {
    const hit = buildRuntimeWarnings({
      subdivSafetyCapHit: false,
      postSubdivTriCount: 1000,
      postDecimateTriCount: Math.floor(1000 * (cfg.warningRuleThresholds.decimationKeptRatioWarnMax - 0.01)),
      decimationRatio: cfg.warningRuleThresholds.decimationRatioWarnMin + 0.01,
    })
    expect(hit.some((w) => w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED)).toBe(true)

    const miss = buildRuntimeWarnings({
      subdivSafetyCapHit: false,
      postSubdivTriCount: 1000,
      postDecimateTriCount: 900,
      decimationRatio: cfg.warningRuleThresholds.decimationRatioWarnMin + 0.01,
    })
    expect(miss.some((w) => w.code === TEXTURIZER_WARNING_CODES.DECIMATION_STRONGER_THAN_REQUESTED)).toBe(false)
  })
})
