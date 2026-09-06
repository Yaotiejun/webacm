export interface TexturizerWarningRuleThresholds {
  decimationRatioWarnMin: number
  decimationKeptRatioWarnMax: number
}

export interface TexturizerSafetyLimits {
  subdivSafetyTrianglesMax: number
}

export interface TexturizerProgressStageWeights {
  subdivision: number
  displacement: number
  decimation: number
  finalize: number
}

export interface TexturizerConfig {
  warningRuleThresholds: TexturizerWarningRuleThresholds
  safetyLimits: TexturizerSafetyLimits
  progressStageWeights: TexturizerProgressStageWeights
}

const DEFAULT_WARNING_RULE_THRESHOLDS: Readonly<TexturizerWarningRuleThresholds> = Object.freeze({
  decimationRatioWarnMin: 0.8,
  decimationKeptRatioWarnMax: 0.65,
})

const FIXED_SAFETY_LIMITS: Readonly<TexturizerSafetyLimits> = Object.freeze({
  subdivSafetyTrianglesMax: 2_000_000,
})

const DEFAULT_PROGRESS_STAGE_WEIGHTS: Readonly<TexturizerProgressStageWeights> = Object.freeze({
  subdivision: 0.25,
  displacement: 0.45,
  decimation: 0.2,
  finalize: 0.05,
})

let warningRuleThresholdOverrides: Partial<TexturizerWarningRuleThresholds> = {}
let progressStageWeightOverrides: Partial<TexturizerProgressStageWeights> = {}

export function getTexturizerConfig(): Readonly<TexturizerConfig> {
  return Object.freeze({
    warningRuleThresholds: Object.freeze({
      ...DEFAULT_WARNING_RULE_THRESHOLDS,
      ...warningRuleThresholdOverrides,
    }),
    safetyLimits: FIXED_SAFETY_LIMITS,
    progressStageWeights: Object.freeze({
      ...DEFAULT_PROGRESS_STAGE_WEIGHTS,
      ...progressStageWeightOverrides,
    }),
  })
}

export function setTexturizerWarningRuleThresholdOverrides(overrides: Partial<TexturizerWarningRuleThresholds>) {
  const next: Partial<TexturizerWarningRuleThresholds> = {}
  if (overrides.decimationRatioWarnMin != null) {
    const v = Number(overrides.decimationRatioWarnMin)
    if (Number.isFinite(v)) next.decimationRatioWarnMin = v
  }
  if (overrides.decimationKeptRatioWarnMax != null) {
    const v = Number(overrides.decimationKeptRatioWarnMax)
    if (Number.isFinite(v)) next.decimationKeptRatioWarnMax = v
  }
  warningRuleThresholdOverrides = next
}

export function resetTexturizerWarningRuleThresholdOverrides() {
  warningRuleThresholdOverrides = {}
}

export function setTexturizerProgressStageWeightOverrides(overrides: Partial<TexturizerProgressStageWeights>) {
  const next: Partial<TexturizerProgressStageWeights> = {}
  const sub = Number(overrides.subdivision)
  const disp = Number(overrides.displacement)
  const dec = Number(overrides.decimation)
  const fin = Number(overrides.finalize)
  if (Number.isFinite(sub) && sub >= 0) next.subdivision = sub
  if (Number.isFinite(disp) && disp >= 0) next.displacement = disp
  if (Number.isFinite(dec) && dec >= 0) next.decimation = dec
  if (Number.isFinite(fin) && fin >= 0) next.finalize = fin
  progressStageWeightOverrides = next
}

export function resetTexturizerProgressStageWeightOverrides() {
  progressStageWeightOverrides = {}
}
