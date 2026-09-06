/** grip grid-bot advanced OK format — mirror device-bridge `formatGridbotAdvancedOk`. */
export function parseGridbotLineNo(line: string): number | null {
  const m = line.match(/^N(\d+)\b/)
  return m ? Number(m[1]) : null
}

export function formatGridbotAdvancedOk(
  lineNo: number | null,
  bufFree: number,
  plnFree: number,
): string {
  const n = lineNo != null ? ` N${lineNo}` : ''
  return `ok${n} B${bufFree} P${plnFree}`
}
