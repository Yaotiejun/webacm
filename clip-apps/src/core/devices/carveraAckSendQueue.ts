/**
 * GRBL-style ok + optional planner-buffer gate for Carvera line streaming.
 * Simpler than GridBot ADVANCED_OK — one command → wait `ok`, optionally hold when Buf is low.
 */

export type CarveraSendFn = (line: string) => void

export interface CarveraAckSendQueueOptions {
  /** Minimum free planner slots before pumping another line (grip Buf). Default 1. */
  minPlannerBuf?: number
  /** Max unacked lines in flight. Default 1 (strict serial ok). */
  maxInFlight?: number
}

export class CarveraAckSendQueue {
  readonly minPlannerBuf: number
  readonly maxInFlight: number

  private pending: string[] = []
  private inFlight = 0
  private ackCount = 0

  constructor(opts: CarveraAckSendQueueOptions = {}) {
    this.minPlannerBuf = opts.minPlannerBuf ?? 1
    this.maxInFlight = Math.max(1, opts.maxInFlight ?? 1)
  }

  get pendingCount(): number {
    return this.pending.length
  }

  get unackedCount(): number {
    return this.inFlight
  }

  get ackedCount(): number {
    return this.ackCount
  }

  enqueue(lines: string[]): void {
    for (const line of lines) {
      const t = line.trim()
      if (t) this.pending.push(t)
    }
  }

  isFinished(): boolean {
    return this.pending.length === 0 && this.inFlight === 0
  }

  needsFlowWait(plannerBuf: number | undefined): boolean {
    if (this.pending.length === 0) return false
    if (this.inFlight >= this.maxInFlight) return true
    if (plannerBuf != null && plannerBuf < this.minPlannerBuf) return true
    return false
  }

  /** Handle firmware `ok` (case-insensitive). Returns true if an in-flight slot was freed. */
  handleOk(): boolean {
    if (this.inFlight <= 0) return false
    this.inFlight -= 1
    this.ackCount += 1
    return true
  }

  /**
   * Pump as many lines as flow allows.
   * @returns number of lines sent this call
   */
  pump(send: CarveraSendFn, plannerBuf: number | undefined): number {
    let sent = 0
    while (this.pending.length > 0 && this.inFlight < this.maxInFlight) {
      if (plannerBuf != null && plannerBuf < this.minPlannerBuf) break
      const line = this.pending.shift()!
      send(line)
      this.inFlight += 1
      sent += 1
      // After first send without known buf, wait for ok before next (serial).
      if (plannerBuf == null) break
    }
    return sent
  }

  dispose(): void {
    this.pending = []
    this.inFlight = 0
  }
}

export function isCarveraOkLine(line: string): boolean {
  return line.trim().toLowerCase() === 'ok'
}
