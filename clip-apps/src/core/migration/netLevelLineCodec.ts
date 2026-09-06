/**
 * grip `net-level` JSON line framing (`encode` / `decode` in lib/util.js).
 */
export function netLevelEncodeLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`
}

export function netLevelDecodeLine(line: string): unknown {
  return JSON.parse(line.trim())
}
