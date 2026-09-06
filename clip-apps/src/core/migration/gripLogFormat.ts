/**
 * grip `log-util` console timestamp (`YYMMDD.HHmmss`), without moment/fs deps.
 */
export function formatGripLogTimestamp(date: Date): string {
  const y = date.getFullYear() % 100
  const mo = date.getMonth() + 1
  const d = date.getDate()
  const h = date.getHours()
  const mi = date.getMinutes()
  const s = date.getSeconds()
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${pad2(y)}${pad2(mo)}${pad2(d)}.${pad2(h)}${pad2(mi)}${pad2(s)}`
}

/** Single-line grip log record: timestamp + JSON args (file sink uses `YYMMDD-HHmmss`). */
export function formatGripLogRecord(
  date: Date,
  values: readonly unknown[],
): string {
  const body = values.map((v) => JSON.stringify(v)).join(' ')
  return `${formatGripLogTimestamp(date)} ${body}`
}
