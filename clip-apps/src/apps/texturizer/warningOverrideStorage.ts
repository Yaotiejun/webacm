import type { TexturizerProgressStageWeights, TexturizerWarningRuleThresholds } from '@/core/texturizer/config'

export const SESSION_WARNING_RULE_OVERRIDES_KEY = 'ws-texturizer-warning-rule-overrides'
export const SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY = 'ws-texturizer-progress-stage-weight-overrides'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type DevWindowLike = Window & {
  __texturizerWarningOverrides?: WarningOverrideDebugApi
  __texturizerProgressWeights?: ProgressWeightOverrideDebugApi
  __texturizerDebug?: TexturizerDebugApi
}

export interface WarningOverrideDebugApi {
  get: () => Partial<TexturizerWarningRuleThresholds>
  set: (overrides: Partial<TexturizerWarningRuleThresholds>) => Partial<TexturizerWarningRuleThresholds>
  reset: () => void
  exportJson: () => string
}
export type WarningOverridesChangeListener = (overrides: Partial<TexturizerWarningRuleThresholds>) => void
export type ProgressWeightOverridesChangeListener = (overrides: Partial<TexturizerProgressStageWeights>) => void

export interface ProgressWeightOverrideDebugApi {
  get: () => Partial<TexturizerProgressStageWeights>
  set: (overrides: Partial<TexturizerProgressStageWeights>) => Partial<TexturizerProgressStageWeights>
  reset: () => void
  exportJson: () => string
}

export interface TexturizerDebugApi {
  warningRules: WarningOverrideDebugApi
  progressWeights: ProgressWeightOverrideDebugApi
}

function toFiniteNumber(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function sanitizeWarningRuleOverrides(input: unknown): Partial<TexturizerWarningRuleThresholds> {
  if (!input || typeof input !== 'object') return {}
  const src = input as Record<string, unknown>
  const out: Partial<TexturizerWarningRuleThresholds> = {}
  const ratioMin = toFiniteNumber(src.decimationRatioWarnMin)
  const keptMax = toFiniteNumber(src.decimationKeptRatioWarnMax)
  if (ratioMin != null) out.decimationRatioWarnMin = ratioMin
  if (keptMax != null) out.decimationKeptRatioWarnMax = keptMax
  return out
}

export function parseWarningRuleOverridesJson(raw: string): Partial<TexturizerWarningRuleThresholds> {
  try {
    return sanitizeWarningRuleOverrides(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function exportWarningRuleOverridesJson(overrides: Partial<TexturizerWarningRuleThresholds>): string {
  return JSON.stringify(sanitizeWarningRuleOverrides(overrides), null, 2)
}

export function loadWarningRuleOverrides(storage: StorageLike): Partial<TexturizerWarningRuleThresholds> {
  const raw = storage.getItem(SESSION_WARNING_RULE_OVERRIDES_KEY)
  if (!raw) return {}
  return parseWarningRuleOverridesJson(raw)
}

export function saveWarningRuleOverrides(storage: StorageLike, overrides: Partial<TexturizerWarningRuleThresholds>) {
  const clean = sanitizeWarningRuleOverrides(overrides)
  if (!Object.keys(clean).length) {
    storage.removeItem(SESSION_WARNING_RULE_OVERRIDES_KEY)
    return
  }
  storage.setItem(SESSION_WARNING_RULE_OVERRIDES_KEY, exportWarningRuleOverridesJson(clean))
}

export function sanitizeProgressStageWeightOverrides(input: unknown): Partial<TexturizerProgressStageWeights> {
  if (!input || typeof input !== 'object') return {}
  const src = input as Record<string, unknown>
  const out: Partial<TexturizerProgressStageWeights> = {}
  const sub = toFiniteNumber(src.subdivision)
  const disp = toFiniteNumber(src.displacement)
  const dec = toFiniteNumber(src.decimation)
  const fin = toFiniteNumber(src.finalize)
  if (sub != null && sub >= 0) out.subdivision = sub
  if (disp != null && disp >= 0) out.displacement = disp
  if (dec != null && dec >= 0) out.decimation = dec
  if (fin != null && fin >= 0) out.finalize = fin
  return out
}

export function parseProgressStageWeightOverridesJson(raw: string): Partial<TexturizerProgressStageWeights> {
  try {
    return sanitizeProgressStageWeightOverrides(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function exportProgressStageWeightOverridesJson(overrides: Partial<TexturizerProgressStageWeights>): string {
  return JSON.stringify(sanitizeProgressStageWeightOverrides(overrides), null, 2)
}

export function loadProgressStageWeightOverrides(storage: StorageLike): Partial<TexturizerProgressStageWeights> {
  const raw = storage.getItem(SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY)
  if (!raw) return {}
  return parseProgressStageWeightOverridesJson(raw)
}

export function saveProgressStageWeightOverrides(storage: StorageLike, overrides: Partial<TexturizerProgressStageWeights>) {
  const clean = sanitizeProgressStageWeightOverrides(overrides)
  if (!Object.keys(clean).length) {
    storage.removeItem(SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY)
    return
  }
  storage.setItem(SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY, exportProgressStageWeightOverridesJson(clean))
}

export function createWarningOverrideDebugApi(
  storage: StorageLike,
  onChange?: WarningOverridesChangeListener,
): WarningOverrideDebugApi {
  return {
    get: () => loadWarningRuleOverrides(storage),
    set: (overrides) => {
      saveWarningRuleOverrides(storage, overrides)
      const next = loadWarningRuleOverrides(storage)
      onChange?.(next)
      return next
    },
    reset: () => {
      storage.removeItem(SESSION_WARNING_RULE_OVERRIDES_KEY)
      onChange?.({})
    },
    exportJson: () => exportWarningRuleOverridesJson(loadWarningRuleOverrides(storage)),
  }
}

export function createProgressWeightOverrideDebugApi(
  storage: StorageLike,
  onChange?: ProgressWeightOverridesChangeListener,
): ProgressWeightOverrideDebugApi {
  return {
    get: () => loadProgressStageWeightOverrides(storage),
    set: (overrides) => {
      saveProgressStageWeightOverrides(storage, overrides)
      const next = loadProgressStageWeightOverrides(storage)
      onChange?.(next)
      return next
    },
    reset: () => {
      storage.removeItem(SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY)
      onChange?.({})
    },
    exportJson: () => exportProgressStageWeightOverridesJson(loadProgressStageWeightOverrides(storage)),
  }
}

export function installWarningOverrideDebugApi(
  storage: StorageLike,
  targetWindow: Window,
  onChange?: WarningOverridesChangeListener,
) {
  const w = targetWindow as DevWindowLike
  w.__texturizerWarningOverrides = createWarningOverrideDebugApi(storage, onChange)
}

export function installProgressWeightOverrideDebugApi(
  storage: StorageLike,
  targetWindow: Window,
  onChange?: ProgressWeightOverridesChangeListener,
) {
  const w = targetWindow as DevWindowLike
  w.__texturizerProgressWeights = createProgressWeightOverrideDebugApi(storage, onChange)
}

export function installTexturizerDebugApi(
  storage: StorageLike,
  targetWindow: Window,
  options?: {
    warningRuleOnChange?: WarningOverridesChangeListener
    progressWeightOnChange?: ProgressWeightOverridesChangeListener
  },
) {
  const w = targetWindow as DevWindowLike
  const warningRules = createWarningOverrideDebugApi(storage, options?.warningRuleOnChange)
  const progressWeights = createProgressWeightOverrideDebugApi(storage, options?.progressWeightOnChange)
  w.__texturizerWarningOverrides = warningRules
  w.__texturizerProgressWeights = progressWeights
  w.__texturizerDebug = { warningRules, progressWeights }
}
