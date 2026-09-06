export function clonePlain<T>(value: T): T {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = (globalThis as any).structuredClone as ((v: any) => any) | undefined
    if (sc) return sc(value)
  } catch {
    // fall through
  }
  return JSON.parse(JSON.stringify(value)) as T
}
