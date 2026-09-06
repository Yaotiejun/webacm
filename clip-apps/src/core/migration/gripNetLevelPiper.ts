/**
 * grip `net-level` `Piper` — in-process string queue between named pipes.
 */
export class GripNetLevelPiper {
  readonly name: string
  private downstream: GripNetLevelPiper | null = null
  private readonly queue: string[] = []
  private readable: (() => void) | null = null

  constructor(name: string) {
    this.name = name
  }

  pipe(target: GripNetLevelPiper): void {
    this.downstream = target
  }

  push(str: string): void {
    this.queue.push(str)
    this.readable?.()
  }

  on(event: 'readable', fn: () => void): void {
    if (event === 'readable') this.readable = fn
  }

  read(): string | undefined {
    return this.queue.length ? this.queue.shift() : undefined
  }

  write(str: string): void {
    this.downstream?.push(str)
  }
}
