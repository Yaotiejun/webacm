import { describe, expect, it } from 'vitest'
import {
  applyGridbotAdvancedOkParse,
  createGridbotAdvancedOkSlots,
  isGridbotAdvancedOkFlowBlocked,
  parseGridbotAdvancedOkLine,
} from './gridbotAdvancedOk'

describe('gridbotAdvancedOk', () => {
  it('parses B/P/N from ADVANCED_OK', () => {
    expect(parseGridbotAdvancedOkLine('ok B15 P16')).toEqual({ bufFree: 15, plnFree: 16 })
    expect(parseGridbotAdvancedOkLine('ok N42 B8 P4')).toEqual({ ackLineNo: 42, bufFree: 8, plnFree: 4 })
    expect(parseGridbotAdvancedOkLine('ok T:200 B:60 /65')).toEqual({})
  })

  it('blocks pump when buffer slots are low (grip 1/5 rule)', () => {
    const slots = createGridbotAdvancedOkSlots()
    applyGridbotAdvancedOkParse(slots, { bufFree: 8, plnFree: 20 })
    expect(isGridbotAdvancedOkFlowBlocked(slots, 8)).toBe(false)
    applyGridbotAdvancedOkParse(slots, { bufFree: 1 })
    expect(isGridbotAdvancedOkFlowBlocked(slots, 8)).toBe(true)
    applyGridbotAdvancedOkParse(slots, { bufFree: 8, plnFree: 2 })
    expect(isGridbotAdvancedOkFlowBlocked(slots, 8)).toBe(true)
  })
})
