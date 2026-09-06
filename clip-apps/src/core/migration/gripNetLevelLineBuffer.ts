/**
 * grip `net-level` `LineBuffer` — accumulate chunks and emit `\n`-delimited lines.
 */
export class GripNetLevelLineBuffer {
  enabled = true
  private buffer = ''

  constructor(private readonly onLine: (line: string) => void) {}

  onData(data: string): void {
    this.buffer += data
    this.nextLine()
  }

  private nextLine(): void {
    if (!this.enabled) return
    let left = 0
    const lf = this.buffer.indexOf('\n')
    if (lf < 0) return
    const cr = this.buffer.indexOf('\r')
    if (cr >= 0 && cr + 1 === lf) left = 1
    const slice = this.buffer.slice(0, lf - left)
    this.onLine(slice)
    this.buffer = this.buffer.slice(lf + 1)
    this.nextLine()
  }
}
