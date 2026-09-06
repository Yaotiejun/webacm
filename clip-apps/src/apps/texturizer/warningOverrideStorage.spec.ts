import { describe, expect, it } from 'vitest'
import type { TexturizerProgressStageWeights, TexturizerWarningRuleThresholds } from '@/core/texturizer/config'
import {
  createProgressWeightOverrideDebugApi,
  createWarningOverrideDebugApi,
  exportProgressStageWeightOverridesJson,
  exportWarningRuleOverridesJson,
  installTexturizerDebugApi,
  installProgressWeightOverrideDebugApi,
  installWarningOverrideDebugApi,
  loadProgressStageWeightOverrides,
  loadWarningRuleOverrides,
  parseProgressStageWeightOverridesJson,
  parseWarningRuleOverridesJson,
  sanitizeProgressStageWeightOverrides,
  sanitizeWarningRuleOverrides,
  saveProgressStageWeightOverrides,
  SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY,
  saveWarningRuleOverrides,
  SESSION_WARNING_RULE_OVERRIDES_KEY,
} from './warningOverrideStorage'

function createStorageMock() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

describe('warningOverrideStorage', () => {
  it('sanitizes and parses overrides payload', () => {
    const clean = sanitizeWarningRuleOverrides({
      decimationRatioWarnMin: '0.91',
      decimationKeptRatioWarnMax: 0.62,
      extra: 'ignored',
    })
    expect(clean).toEqual({
      decimationRatioWarnMin: 0.91,
      decimationKeptRatioWarnMax: 0.62,
    })

    const parsed = parseWarningRuleOverridesJson('{"decimationRatioWarnMin":0.88}')
    expect(parsed.decimationRatioWarnMin).toBe(0.88)
  })

  it('exports and persists overrides via storage helpers', () => {
    const storage = createStorageMock()
    saveWarningRuleOverrides(storage, { decimationRatioWarnMin: 0.93 })
    const raw = storage.getItem(SESSION_WARNING_RULE_OVERRIDES_KEY) ?? ''
    expect(raw).toContain('0.93')
    expect(exportWarningRuleOverridesJson({ decimationKeptRatioWarnMax: 0.6 })).toContain('0.6')
    expect(loadWarningRuleOverrides(storage).decimationRatioWarnMin).toBe(0.93)
  })

  it('clears storage when overrides are empty/invalid', () => {
    const storage = createStorageMock()
    storage.setItem(SESSION_WARNING_RULE_OVERRIDES_KEY, '{"decimationRatioWarnMin":0.9}')
    saveWarningRuleOverrides(storage, {})
    expect(storage.getItem(SESSION_WARNING_RULE_OVERRIDES_KEY)).toBeNull()
    storage.setItem(SESSION_WARNING_RULE_OVERRIDES_KEY, '{bad json')
    expect(loadWarningRuleOverrides(storage)).toEqual({})
  })

  it('supports debug API get/set/reset/export', () => {
    const storage = createStorageMock()
    const changes: Array<Partial<TexturizerWarningRuleThresholds>> = []
    const api = createWarningOverrideDebugApi(storage)
    expect(api.get()).toEqual({})
    expect(api.set({ decimationRatioWarnMin: 0.95 })).toEqual({ decimationRatioWarnMin: 0.95 })
    expect(api.exportJson()).toContain('0.95')
    api.reset()
    expect(api.get()).toEqual({})
    const apiWithChange = createWarningOverrideDebugApi(storage, (overrides) => {
      changes.push(overrides)
    })
    apiWithChange.set({ decimationKeptRatioWarnMax: 0.61 })
    apiWithChange.reset()
    expect(changes).toEqual([{ decimationKeptRatioWarnMax: 0.61 }, {}])
  })

  it('installs debug API onto window-like target', () => {
    const storage = createStorageMock()
    const win = {} as unknown as Window & { __texturizerWarningOverrides?: ReturnType<typeof createWarningOverrideDebugApi> }
    installWarningOverrideDebugApi(storage, win)
    expect(typeof win.__texturizerWarningOverrides?.set).toBe('function')
  })

  it('sanitizes and persists progress weight overrides', () => {
    const storage = createStorageMock()
    const clean = sanitizeProgressStageWeightOverrides({
      subdivision: '0.3',
      displacement: 0.4,
      decimation: 0.2,
      finalize: 0.1,
      bad: 'x',
    })
    expect(clean).toEqual({
      subdivision: 0.3,
      displacement: 0.4,
      decimation: 0.2,
      finalize: 0.1,
    })
    expect(parseProgressStageWeightOverridesJson('{"subdivision":0.31}').subdivision).toBe(0.31)
    saveProgressStageWeightOverrides(storage, { displacement: 0.5 })
    expect(loadProgressStageWeightOverrides(storage).displacement).toBe(0.5)
    expect(exportProgressStageWeightOverridesJson({ finalize: 0.08 })).toContain('0.08')
    saveProgressStageWeightOverrides(storage, {})
    expect(storage.getItem(SESSION_PROGRESS_STAGE_WEIGHT_OVERRIDES_KEY)).toBeNull()
  })

  it('supports progress weight debug API and installer', () => {
    const storage = createStorageMock()
    const changes: Array<Partial<TexturizerProgressStageWeights>> = []
    const api = createProgressWeightOverrideDebugApi(storage, (v) => changes.push(v))
    expect(api.get()).toEqual({})
    expect(api.set({ decimation: 0.22 })).toEqual({ decimation: 0.22 })
    expect(api.exportJson()).toContain('0.22')
    api.reset()
    expect(changes).toEqual([{ decimation: 0.22 }, {}])

    const win = {} as unknown as Window & { __texturizerProgressWeights?: ReturnType<typeof createProgressWeightOverrideDebugApi> }
    installProgressWeightOverrideDebugApi(storage, win)
    expect(typeof win.__texturizerProgressWeights?.set).toBe('function')
  })

  it('installs unified texturizer debug API', () => {
    const storage = createStorageMock()
    const win = {} as unknown as Window & {
      __texturizerDebug?: {
        warningRules: ReturnType<typeof createWarningOverrideDebugApi>
        progressWeights: ReturnType<typeof createProgressWeightOverrideDebugApi>
      }
      __texturizerWarningOverrides?: ReturnType<typeof createWarningOverrideDebugApi>
      __texturizerProgressWeights?: ReturnType<typeof createProgressWeightOverrideDebugApi>
    }
    installTexturizerDebugApi(storage, win)
    expect(typeof win.__texturizerDebug?.warningRules.set).toBe('function')
    expect(typeof win.__texturizerDebug?.progressWeights.set).toBe('function')
    expect(typeof win.__texturizerWarningOverrides?.set).toBe('function')
    expect(typeof win.__texturizerProgressWeights?.set).toBe('function')
  })
})
