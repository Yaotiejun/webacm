import { describe, expect, it } from 'vitest'
import {
  computeGridbotPrintElapsedMs,
  formatGridbotPrintElapsed,
  gridbotPrintElapsedPhase,
  gridbotPrintStartMs,
} from './gridbotPrintElapsed'

describe('gridbotPrintElapsed', () => {
  it('formatGridbotPrintElapsed matches grip HH:MM:SS', () => {
    expect(formatGridbotPrintElapsed(0)).toBe('00:00:00')
    expect(formatGridbotPrintElapsed(65_000)).toBe('00:01:05')
    expect(formatGridbotPrintElapsed(3_661_000)).toBe('01:01:01')
  })

  it('computeGridbotPrintElapsedMs uses body start after M117', () => {
    const prepAt = 1000
    const bodyStartedAt = 5000
    const endedAt = 12_000
    expect(gridbotPrintStartMs({ prepAt, bodyStartedAt, endedAt: null, markAt: null })).toBe(5000)
    expect(
      computeGridbotPrintElapsedMs({ prepAt, bodyStartedAt, endedAt, markAt: null }),
    ).toBe(7000)
  })

  it('live elapsed uses mark or now before end', () => {
    expect(
      computeGridbotPrintElapsedMs({
        prepAt: 1000,
        bodyStartedAt: null,
        endedAt: null,
        markAt: 4000,
        now: 9000,
      }),
    ).toBe(3000)
    expect(
      computeGridbotPrintElapsedMs({
        prepAt: 1000,
        bodyStartedAt: null,
        endedAt: null,
        markAt: null,
        now: 8000,
      }),
    ).toBe(7000)
  })

  it('gridbotPrintElapsedPhase reflects grip prep/body/done', () => {
    expect(
      gridbotPrintElapsedPhase({
        prepAt: 1,
        bodyStartedAt: null,
        endedAt: null,
        markAt: null,
      }),
    ).toBe('head')
    expect(
      gridbotPrintElapsedPhase({
        prepAt: 1,
        bodyStartedAt: 2,
        endedAt: null,
        markAt: null,
      }),
    ).toBe('body')
    expect(
      gridbotPrintElapsedPhase({
        prepAt: 1,
        bodyStartedAt: 2,
        endedAt: 99,
        markAt: null,
      }),
    ).toBe('done')
  })
})
