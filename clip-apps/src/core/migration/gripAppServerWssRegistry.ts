/** grip `updateApp` `wss(path, fn)` registry (in-process stub). */
export type GripAppWssHandler = (payload: unknown) => void

export class GripAppServerWssRegistry {
  private readonly handlers = new Map<string, GripAppWssHandler>()

  register(path: string, handler: GripAppWssHandler): void {
    this.handlers.set(path, handler)
  }

  dispatch(path: string, payload: unknown): boolean {
    const fn = this.handlers.get(path)
    if (!fn) return false
    fn(payload)
    return true
  }

  paths(): string[] {
    return [...this.handlers.keys()]
  }
}
