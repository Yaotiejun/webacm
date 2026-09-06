import { describe, expect, it } from 'vitest'
import {
  getTexturizerConfig,
  resetTexturizerProgressStageWeightOverrides,
  resetTexturizerWarningRuleThresholdOverrides,
  setTexturizerProgressStageWeightOverrides,
  setTexturizerWarningRuleThresholdOverrides,
} from './config'

describe('texturizer config', () => {
  it('applies warning threshold overrides only', () => {
    resetTexturizerWarningRuleThresholdOverrides()
    setTexturizerWarningRuleThresholdOverrides({
      decimationRatioWarnMin: 0.9,
      decimationKeptRatioWarnMax: 0.6,
    })
    const cfg = getTexturizerConfig()
    expect(cfg.warningRuleThresholds.decimationRatioWarnMin).toBe(0.9)
    expect(cfg.warningRuleThresholds.decimationKeptRatioWarnMax).toBe(0.6)
    expect(cfg.safetyLimits.subdivSafetyTrianglesMax).toBe(2_000_000)
  })

  it('resets warning threshold overrides to defaults', () => {
    setTexturizerWarningRuleThresholdOverrides({
      decimationRatioWarnMin: 0.91,
    })
    resetTexturizerWarningRuleThresholdOverrides()
    const cfg = getTexturizerConfig()
    expect(cfg.warningRuleThresholds.decimationRatioWarnMin).toBe(0.8)
    expect(cfg.warningRuleThresholds.decimationKeptRatioWarnMax).toBe(0.65)
  })

  it('applies and resets progress stage weight overrides', () => {
    resetTexturizerProgressStageWeightOverrides()
    setTexturizerProgressStageWeightOverrides({
      subdivision: 0.2,
      displacement: 0.5,
    })
    let cfg = getTexturizerConfig()
    expect(cfg.progressStageWeights.subdivision).toBe(0.2)
    expect(cfg.progressStageWeights.displacement).toBe(0.5)
    expect(cfg.progressStageWeights.decimation).toBe(0.2)
    expect(cfg.progressStageWeights.finalize).toBe(0.05)
    resetTexturizerProgressStageWeightOverrides()
    cfg = getTexturizerConfig()
    expect(cfg.progressStageWeights.subdivision).toBe(0.25)
    expect(cfg.progressStageWeights.displacement).toBe(0.45)
  })
})
