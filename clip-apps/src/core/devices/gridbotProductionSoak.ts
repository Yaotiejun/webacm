import { parseGridbotAdvancedOkLine } from '@/core/devices/gridbotAdvancedOk'
import {
  evaluateGridbotBridgeMockSoak,
  type GridbotBridgeMockSoakSample,
} from '@/core/devices/gridbotBridgeMockSoak'

export type GridbotProductionSoakSample = GridbotBridgeMockSoakSample

export interface GridbotProductionSoakResult {
  ok: boolean
  sawM105: boolean
  sawM114: boolean
  sawAdvancedOk: boolean
  pollCount: number
  errors: string[]
}

export function gridbotProductionSoakWebSocketUrl(): string | null {
  return process.env.GRIDBOT_SOAK_WS?.trim() || null
}

export function gridbotProductionSoakMinSamples(): number {
  const n = Number(process.env.GRIDBOT_SOAK_MIN_SAMPLES ?? 4)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4
}

/** Production / bridge soak: temp poll, position, and ADVANCED_OK B/P slots. */
export function evaluateGridbotProductionSoak(
  samples: readonly GridbotProductionSoakSample[],
): GridbotProductionSoakResult {
  const base = evaluateGridbotBridgeMockSoak(samples)
  const errors = [...base.errors]
  let sawAdvancedOk = false

  for (const sample of samples) {
    const parsed = parseGridbotAdvancedOkLine(sample.line)
    if (parsed?.bufFree != null && parsed?.plnFree != null) sawAdvancedOk = true
  }

  const minSamples = gridbotProductionSoakMinSamples()
  if (samples.length < minSamples) {
    errors.push(`need at least ${minSamples} lines, got ${samples.length}`)
  }
  if (!sawAdvancedOk) errors.push('missing ADVANCED_OK with B and P slots')

  return {
    ok: errors.length === 0,
    sawM105: base.sawM105,
    sawM114: base.sawM114,
    sawAdvancedOk,
    pollCount: base.pollCount,
    errors,
  }
}
