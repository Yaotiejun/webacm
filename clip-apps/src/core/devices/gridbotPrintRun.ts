/**
 * grip `grid-bot` `status.print.run` — true while a job send/print session is active.
 */
export function isGridbotPrintRunActive(input: {
  sending: boolean
  printPrepAt: number | null
  printEndedAt: number | null
}): boolean {
  if (input.sending) return true
  return input.printPrepAt != null && input.printEndedAt == null
}
