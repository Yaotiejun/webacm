/** grip `checkOpenReqs` — flag requests open longer than threshold (default 5s). */
export interface GripSlowRequestEntry {
  path: string
  startMs: number
  reported: boolean
}

export class GripAppServerSlowRequestWatcher {
  private readonly open = new Map<string, GripSlowRequestEntry>()

  track(path: string, startMs: number): string {
    const id = `${path}:${startMs}`
    this.open.set(id, { path, startMs, reported: false })
    return id
  }

  close(id: string): void {
    this.open.delete(id)
  }

  tick(nowMs: number, thresholdMs = 5000): string[] {
    const slow: string[] = []
    for (const [id, entry] of this.open) {
      if (entry.reported) continue
      if (nowMs - entry.startMs > thresholdMs) {
        entry.reported = true
        slow.push(entry.path)
        this.open.set(id, entry)
      }
    }
    return slow
  }
}
