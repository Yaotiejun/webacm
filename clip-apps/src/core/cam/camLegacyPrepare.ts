/**
 * Runs legacy `cam_prepare` after `cam_slice` so `cam_export` receives `print.output`.
 */
import { cam_prepare } from '@/core/cam/legacy/kiri/mode/cam/prepare.js'
import type { KiriCamWidgetStub } from '@/core/cam/kiriCamWidget'

type KiriWorkerStub = {
  current: { print?: { output?: unknown[] } }
}

function ensureKiriWorkerStub(): void {
  const g = globalThis as typeof globalThis & { self?: typeof globalThis & { kiri_worker?: KiriWorkerStub } }
  const selfRef = g.self ?? g
  g.self = selfRef
  if (!selfRef.kiri_worker) {
    selfRef.kiri_worker = { current: {} }
  }
}

export async function runLegacyCamPrepare(
  widgets: KiriCamWidgetStub[],
  settings: Record<string, unknown>,
  onProgress?: (progress: number, message?: string) => void,
): Promise<{ output: unknown[] }> {
  ensureKiriWorkerStub()
  await cam_prepare(widgets, settings, (progress, msg) => {
    onProgress?.(progress, typeof msg === 'string' ? msg : undefined)
  })
  const print = (globalThis as typeof globalThis & { self: { kiri_worker: KiriWorkerStub } }).self.kiri_worker
    .current.print
  const output = print?.output
  if (!Array.isArray(output) || output.length === 0) {
    throw new Error('legacy cam_prepare produced empty print.output')
  }
  return { output }
}
