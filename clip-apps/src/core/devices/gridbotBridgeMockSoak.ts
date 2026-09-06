import {
  parseGridbotM105Line,
  parseGridbotM114Line,
} from '@/core/devices/gridbotLineParse'

export interface GridbotBridgeMockSoakSample {
  line: string
  at: number
}

export interface GridbotBridgeMockSoakResult {
  ok: boolean
  sawM105: boolean
  sawM114: boolean
  pollCount: number
  errors: string[]
}

/** Evaluate polled mock bridge lines (grip grid-bot periodic T/B + optional M114). */
export function evaluateGridbotBridgeMockSoak(
  samples: readonly GridbotBridgeMockSoakSample[],
): GridbotBridgeMockSoakResult {
  const errors: string[] = []
  let sawM105 = false
  let sawM114 = false

  for (const sample of samples) {
    const trimmed = sample.line.trim()
    if (parseGridbotM105Line(trimmed)) sawM105 = true
    if (parseGridbotM114Line(trimmed)) sawM114 = true
  }

  if (!sawM105) errors.push('missing parseable M105 T/B line')
  if (!sawM114) errors.push('missing parseable M114 position line')

  return {
    ok: errors.length === 0,
    sawM105,
    sawM114,
    pollCount: samples.length,
    errors,
  }
}
