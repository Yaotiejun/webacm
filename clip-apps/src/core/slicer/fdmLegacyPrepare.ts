/**
 * Runs legacy `fdm_prepare` after `fdm_slice` so `fdm_export` receives `print.output`.
 */
type KiriWorkerStub = {
  current: { print?: { output?: unknown[]; settings?: unknown; widgets?: unknown[] } }
  cache?: Record<string, unknown>
  minions?: { concurrent?: boolean }
}

export function ensureKiriWorkerStub(scope: any = globalThis): KiriWorkerStub {
  const g = scope as typeof globalThis & {
    self?: typeof globalThis & { kiri_worker?: KiriWorkerStub }
    kiri_worker?: KiriWorkerStub
  }
  const selfRef = g.self ?? g
  g.self = selfRef
  if (!selfRef.kiri_worker) {
    selfRef.kiri_worker = { current: {}, cache: {}, minions: { concurrent: false } }
  }
  if (!selfRef.kiri_worker.current) {
    selfRef.kiri_worker.current = {}
  }
  g.kiri_worker = selfRef.kiri_worker
  return selfRef.kiri_worker
}

export async function runLegacyFdmPrepare(
  widgets: unknown[],
  settings: Record<string, unknown>,
  onProgress?: (progress: number, message?: string) => void,
  workerScope: any = globalThis,
): Promise<{ print: { output: unknown[] } }> {
  // Polyfills must load before geo/print (THREE global).
  await import('@/core/slicer/kiriLegacyPolyfills')
  const { fdm_prepare } = await import('@/core/slicer/legacy/kiri/mode/fdm/work/prepare.js')

  const worker = ensureKiriWorkerStub(workerScope)
  const preparedSettings = { ...settings, render: false }
  await fdm_prepare(widgets, preparedSettings, (progress: number, msg?: string) => {
    onProgress?.(progress, typeof msg === 'string' ? msg : undefined)
  })
  const print = worker.current.print
  const output = print?.output
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error('legacy fdm_prepare produced empty print.output')
  }
  return { print: print as { output: unknown[] } }
}
