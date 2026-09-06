import { isGridbotOkLine, stripGridbotOkPrefix } from '@/core/devices/gridbotLineParse'

/** Slots reported on Marlin ADVANCED_OK (`ok B15 P16` / `ok N123 B15 P16`). */
export interface GridbotAdvancedOkSlots {
  bufFree: number
  plnFree: number
  bufMax: number
  plnMax: number
}

export type GridbotAdvancedOkParse = {
  bufFree?: number
  plnFree?: number
  ackLineNo?: number
}

/** grip `on_serial_line` ok-token scan (B/P/N); ignores `B:` temperature tokens. */
export function parseGridbotAdvancedOkLine(line: string): GridbotAdvancedOkParse | null {
  if (!isGridbotOkLine(line)) return null
  const payload = stripGridbotOkPrefix(line.trim())
  if (!payload) return {}

  const out: GridbotAdvancedOkParse = {}
  for (const tok of payload.split(/\s+/).map((t) => t.trim()).filter(Boolean)) {
    const kind = tok.charAt(0)
    if (kind !== 'N' && kind !== 'B' && kind !== 'P') continue
    if ((kind === 'B' || kind === 'P') && tok.includes(':')) continue
    const num = parseInt(tok.slice(1), 10)
    if (!Number.isFinite(num)) continue
    if (kind === 'N') out.ackLineNo = num
    else if (kind === 'B') out.bufFree = num
    else if (kind === 'P') out.plnFree = num
  }
  return out
}

export function createGridbotAdvancedOkSlots(): GridbotAdvancedOkSlots {
  return { bufFree: Number.POSITIVE_INFINITY, plnFree: Number.POSITIVE_INFINITY, bufMax: 0, plnMax: 0 }
}

export function applyGridbotAdvancedOkParse(
  slots: GridbotAdvancedOkSlots,
  parsed: GridbotAdvancedOkParse,
): void {
  if (parsed.bufFree != null) {
    slots.bufFree = parsed.bufFree
    slots.bufMax = Math.max(slots.bufMax, parsed.bufFree)
  }
  if (parsed.plnFree != null) {
    slots.plnFree = parsed.plnFree
    slots.plnMax = Math.max(slots.plnMax, parsed.plnFree)
  }
}

/**
 * grip `process_queue`: hold outbound when planner/serial buffer is low.
 * @param bufmax configured unacked window (grip `bufmax`)
 */
export function isGridbotAdvancedOkFlowBlocked(slots: GridbotAdvancedOkSlots, bufmax: number): boolean {
  if (slots.plnMax > 0 && slots.plnFree <= slots.plnMax / 5) return true
  if (slots.bufMax > 0 && slots.bufFree <= bufmax / 5) return true
  return false
}
