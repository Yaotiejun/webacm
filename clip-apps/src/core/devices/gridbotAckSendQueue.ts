import {
  applyGridbotAdvancedOkParse,
  createGridbotAdvancedOkSlots,
  isGridbotAdvancedOkFlowBlocked,
  parseGridbotAdvancedOkLine,
  type GridbotAdvancedOkSlots,
} from '@/core/devices/gridbotAdvancedOk'
import {
  GridbotFlowTimeoutRecovery,
  type GridbotFlowTimeoutKind,
} from '@/core/devices/gridbotFlowTimeoutRecovery'
import { isGridbotOkLine, parseGridbotResendLine } from '@/core/devices/gridbotLineParse'
import { isGridbotM117StartLine } from '@/core/devices/gridbotPrintMarkers'

/** grip `histo` lookback cap */
export const GRIDBOT_SEND_HISTORY_MAX = 20

export type GridbotSendFn = (line: string) => void

export interface GridbotQueuedCommand {
  line: string
  lineNo: number
}

/** Marlin `N` line + XOR checksum (grip `server.js` `cksum`). */
export function marlinChecksumLine(line: string, lineNo: number): string {
  const tmp = `N${lineNo} ${line}`
  let cksum = 0
  for (let i = 0; i < tmp.length; i++) {
    cksum ^= tmp.charCodeAt(i)
  }
  return `${tmp}*${cksum}`
}

export interface GridbotAckSendQueueOptions {
  bufmax?: number
  useChecksum?: boolean
  /** Track `ok B… P…` and gate pump (grip ADVANCED_OK / `buf_free` / `pln_free`). */
  advancedOk?: boolean
}

/**
 * Client-side ack window + resend replay (subset of grip `grid-bot` `server.js`).
 */
export class GridbotAckSendQueue {
  readonly bufmax: number
  readonly useChecksum: boolean
  readonly advancedOk: boolean

  private pending: string[] = []
  private match: GridbotQueuedCommand[] = []
  private histo: GridbotQueuedCommand[] = []
  private lineNo = 1
  private waiting = 0
  private resending = false
  private ackCount = 0
  private readonly flowSlots: GridbotAdvancedOkSlots = createGridbotAdvancedOkSlots()
  private readonly flowRecovery = new GridbotFlowTimeoutRecovery()
  private onFlowRecovered: (() => void) | null = null
  private onPrintBodyStart: (() => void) | null = null

  constructor(opts: GridbotAckSendQueueOptions = {}) {
    this.bufmax = opts.bufmax ?? 4
    this.useChecksum = opts.useChecksum ?? false
    this.advancedOk = opts.advancedOk ?? true
  }

  get isResending(): boolean {
    return this.resending
  }

  get unackedCount(): number {
    return this.waiting
  }

  get pendingCount(): number {
    return this.pending.length
  }

  getFlowSlots(): Readonly<GridbotAdvancedOkSlots> {
    return this.flowSlots
  }

  getFlowTimeoutRecovery(): GridbotFlowTimeoutKind | null {
    return this.flowRecovery.state.lastRecovery
  }

  setFlowRecoveredHandler(handler: (() => void) | null): void {
    this.onFlowRecovered = handler
  }

  /** grip `flags.callback` on matched `M117 Start` after firmware `ok`. */
  setPrintBodyStartHandler(handler: (() => void) | null): void {
    this.onPrintBodyStart = handler
  }

  dispose(): void {
    this.flowRecovery.clear()
    this.onFlowRecovered = null
    this.onPrintBodyStart = null
  }

  isFlowBlocked(): boolean {
    if (!this.advancedOk) return false
    return isGridbotAdvancedOkFlowBlocked(this.flowSlots, this.bufmax)
  }

  isFinished(): boolean {
    return this.pending.length === 0 && this.waiting === 0
  }

  /** Waiting for firmware ok while send buffer/planner slots are low. */
  needsFlowWait(): boolean {
    return !this.isFinished() && this.isFlowBlocked()
  }

  enqueue(lines: readonly string[]): void {
    this.pending.push(...lines)
  }

  formatOutgoing(line: string, lineNo: number): string {
    return this.useChecksum ? marlinChecksumLine(line, lineNo) : line
  }

  /** Send up to `bufmax` unacknowledged lines when ADVANCED_OK flow allows. */
  pump(send: GridbotSendFn): number {
    let sent = 0
    while (this.waiting < this.bufmax && this.pending.length > 0 && !this.isFlowBlocked()) {
      const line = this.pending.shift()!
      const lineNo = this.lineNo++
      const rec: GridbotQueuedCommand = { line, lineNo }
      this.match.push(rec)
      this.histo.push(rec)
      if (this.histo.length > GRIDBOT_SEND_HISTORY_MAX) {
        this.histo.shift()
      }
      this.waiting++
      send(this.formatOutgoing(line, lineNo))
      sent++
    }
    return sent
  }

  /**
   * Handle inbound serial line during an active job send.
   * @returns true when the line was consumed by the send state machine.
   */
  handleIncoming(trimmed: string, send: GridbotSendFn): boolean {
    const resendFrom = parseGridbotResendLine(trimmed)
    if (resendFrom != null) {
      this.replayFrom(resendFrom, send)
      return true
    }
    if (isGridbotOkLine(trimmed)) {
      this.handleOk(trimmed, send)
      return true
    }
    return false
  }

  private scheduleFlowRecoveryIfNeeded(send: GridbotSendFn): void {
    if (!this.advancedOk || this.isFinished()) return
    if (!this.isFlowBlocked()) return
    this.flowRecovery.scheduleIfBlocked(this.flowSlots, this.bufmax, this.ackCount, () => {
      this.pump(send)
      this.onFlowRecovered?.()
    })
  }

  handleOk(trimmed: string, send: GridbotSendFn): void {
    if (this.advancedOk) {
      const parsed = parseGridbotAdvancedOkLine(trimmed)
      if (parsed) applyGridbotAdvancedOkParse(this.flowSlots, parsed)
    }
    this.flowRecovery.onAck()
    this.ackCount++
    const matched = this.match[0]
    if (matched && isGridbotM117StartLine(matched.line)) {
      this.onPrintBodyStart?.()
    }
    if (this.match.length > 0) this.match.shift()
    if (this.waiting > 0) this.waiting--
    this.pump(send)
    this.scheduleFlowRecoveryIfNeeded(send)
  }

  /** grip `on_serial_line` resend branch */
  replayFrom(fromLineNo: number, send: GridbotSendFn): void {
    const rerun = this.histo.filter((h) => h.lineNo >= fromLineNo)
    this.match = rerun.slice()
    this.waiting = rerun.length
    this.resending = true
    for (const rec of rerun) {
      send(this.formatOutgoing(rec.line, rec.lineNo))
    }
    this.resending = false
  }
}
