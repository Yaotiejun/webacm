/** grip `status.print` timing fields used by `status_update` elapsed display. */
export interface GridbotPrintElapsedInput {
  prepAt: number | null
  bodyStartedAt: number | null
  endedAt: number | null
  markAt: number | null
  now?: number
}

/** Effective `status.print.start` (body start after M117, else job head). */
export function gridbotPrintStartMs(input: GridbotPrintElapsedInput): number | null {
  return input.bodyStartedAt ?? input.prepAt
}

/**
 * grip `index.js` `status_update` duration:
 * end > start → frozen; else `(mark || now) - start` when prep/start active.
 */
export function computeGridbotPrintElapsedMs(input: GridbotPrintElapsedInput): number {
  const start = gridbotPrintStartMs(input)
  if (start == null) return 0

  const end = input.endedAt
  if (end != null && end > start) return end - start

  if (input.prepAt == null && input.bodyStartedAt == null) return 0

  const now = input.now ?? Date.now()
  return Math.max(0, (input.markAt ?? now) - start)
}

/** grip `elapsed()` — `HH:MM:SS` via moment.duration. */
export function formatGridbotPrintElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const z = (v: number) => (v < 10 ? `0${v}` : String(v))
  return `${z(h)}:${z(m)}:${z(s)}`
}

export type GridbotPrintElapsedPhase = 'idle' | 'head' | 'body' | 'done'

export function gridbotPrintElapsedPhase(input: GridbotPrintElapsedInput): GridbotPrintElapsedPhase {
  if (input.prepAt == null && input.bodyStartedAt == null) return 'idle'
  if (input.endedAt != null) return 'done'
  if (input.bodyStartedAt != null) return 'body'
  return 'head'
}
