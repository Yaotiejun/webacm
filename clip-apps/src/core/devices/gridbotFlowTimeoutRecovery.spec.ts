import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GRIDBOT_BUF_FLOW_TIMEOUT_MS,
  GridbotFlowTimeoutRecovery,
} from './gridbotFlowTimeoutRecovery'
import { applyGridbotAdvancedOkParse, createGridbotAdvancedOkSlots } from './gridbotAdvancedOk'

describe('gridbotFlowTimeoutRecovery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('forces buf_free open after 500ms without new ok (grip buf_timer)', () => {
    const slots = createGridbotAdvancedOkSlots()
    applyGridbotAdvancedOkParse(slots, { bufFree: 8, plnFree: 20 })
    applyGridbotAdvancedOkParse(slots, { bufFree: 1 })

    const recovery = new GridbotFlowTimeoutRecovery()
    let recovered = false
    recovery.scheduleIfBlocked(slots, 8, 0, () => {
      recovered = true
    })

    vi.advanceTimersByTime(GRIDBOT_BUF_FLOW_TIMEOUT_MS - 1)
    expect(recovered).toBe(false)
    expect(Number.isFinite(slots.bufFree)).toBe(true)

    vi.advanceTimersByTime(1)
    expect(recovered).toBe(true)
    expect(slots.bufFree).toBe(Number.POSITIVE_INFINITY)
    expect(recovery.state.lastRecovery).toBe('buffer')
  })

  it('cancels timer when a new ok arrives', () => {
    const slots = createGridbotAdvancedOkSlots()
    applyGridbotAdvancedOkParse(slots, { bufFree: 8, plnFree: 20 })
    applyGridbotAdvancedOkParse(slots, { bufFree: 1 })

    const recovery = new GridbotFlowTimeoutRecovery()
    recovery.scheduleIfBlocked(slots, 8, 0, () => {})
    recovery.onAck()
    vi.advanceTimersByTime(GRIDBOT_BUF_FLOW_TIMEOUT_MS)
    expect(Number.isFinite(slots.bufFree)).toBe(true)
  })
})
