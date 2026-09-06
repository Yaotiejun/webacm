import {
  type GridbotAdvancedOkSlots,
  isGridbotAdvancedOkFlowBlocked,
} from '@/core/devices/gridbotAdvancedOk'

/** grip `process_queue` planner stall timeout */
export const GRIDBOT_PLN_FLOW_TIMEOUT_MS = 100
/** grip `process_queue` serial buffer stall timeout */
export const GRIDBOT_BUF_FLOW_TIMEOUT_MS = 500

export type GridbotFlowTimeoutKind = 'planner' | 'buffer'

export interface GridbotFlowTimeoutRecoveryState {
  lastRecovery: GridbotFlowTimeoutKind | null
}

/**
 * grip `buf_timer` / `pln_timer`: if no new `ok` while flow-blocked, force slots open and resume pump.
 */
export class GridbotFlowTimeoutRecovery {
  private ackAtSchedule = -1
  private bufTimer: ReturnType<typeof setTimeout> | null = null
  private plnTimer: ReturnType<typeof setTimeout> | null = null
  readonly state: GridbotFlowTimeoutRecoveryState = { lastRecovery: null }

  clear(): void {
    if (this.bufTimer != null) clearTimeout(this.bufTimer)
    if (this.plnTimer != null) clearTimeout(this.plnTimer)
    this.bufTimer = null
    this.plnTimer = null
    this.ackAtSchedule = -1
  }

  /** New firmware `ok` — cancel pending stall timers (grip clears timers each `process_queue`). */
  onAck(): void {
    this.clear()
    this.state.lastRecovery = null
  }

  scheduleIfBlocked(
    slots: GridbotAdvancedOkSlots,
    bufmax: number,
    ackCount: number,
    onRecover: () => void,
  ): void {
    this.clear()
    if (!isGridbotAdvancedOkFlowBlocked(slots, bufmax)) return

    this.ackAtSchedule = ackCount

    if (slots.plnMax > 0 && slots.plnFree <= slots.plnMax / 5) {
      this.plnTimer = setTimeout(() => {
        if (this.ackAtSchedule !== ackCount) return
        slots.plnFree = Number.POSITIVE_INFINITY
        this.state.lastRecovery = 'planner'
        onRecover()
      }, GRIDBOT_PLN_FLOW_TIMEOUT_MS)
    }

    if (slots.bufMax > 0 && slots.bufFree <= bufmax / 5) {
      this.bufTimer = setTimeout(() => {
        if (this.ackAtSchedule !== ackCount) return
        slots.bufFree = Number.POSITIVE_INFINITY
        this.state.lastRecovery = 'buffer'
        onRecover()
      }, GRIDBOT_BUF_FLOW_TIMEOUT_MS)
    }
  }
}
