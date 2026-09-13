/**
 * GridBot safety / park macros (subset of grip grid-bot onpause / onabort / onresume).
 */

export const GRIDBOT_PAUSE_PARK_SCRIPT: readonly string[] = Object.freeze([
  'G91',
  'G0 Z10 F600',
  'G90',
])

export const GRIDBOT_RESUME_UNPARK_SCRIPT: readonly string[] = Object.freeze([
  'G91',
  'G0 Z-10 F600',
  'G90',
])

/** Soft cancel after clearing job queue (heaters off, cool fans). */
export const GRIDBOT_CANCEL_SAFETY_SCRIPT: readonly string[] = Object.freeze([
  'M104 S0',
  'M140 S0',
  'M107',
  'M84',
])

/** Emergency stop: abort motion then heaters (grip onabort_fdm subset). */
export const GRIDBOT_ESTOP_SCRIPT: readonly string[] = Object.freeze([
  'M112',
  'M410',
  'M104 S0',
  'M140 S0',
  'M107',
])

export function filterNonEmptyGcodeLines(lines: readonly string[]): string[] {
  return lines.map((l) => l.trim()).filter(Boolean)
}
