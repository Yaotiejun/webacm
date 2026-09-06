import type { RasterRequest, RasterResult } from '@/types/raster'
import { unwrapRasterWorkerPayload } from '@/core/raster/rasterWorkerProtocol'
export interface RunRasterOptions {
  onProgress?: (phase: string, percent: number) => void
}

let gripRasterWorker: Worker | null = null
let gripInflight = false

function getGripRasterWorker() {
  if (gripRasterWorker) return gripRasterWorker
  gripRasterWorker = new Worker(new URL('@/workers/raster-grip.worker.ts', import.meta.url), {
    type: 'module',
  })
  return gripRasterWorker
}

export function resetRasterGripWorkerStateForTests(): void {
  if (gripRasterWorker) {
    try {
      gripRasterWorker.terminate()
    } catch {
      // ignore
    }
    gripRasterWorker = null
  }
  gripInflight = false
}

export function runRasterGripBridge(
  request: RasterRequest,
  options: RunRasterOptions = {},
): Promise<RasterResult> {
  return new Promise((resolve, reject) => {
    if (gripInflight) {
      reject(new Error('Raster grip worker is busy; please retry'))
      return
    }
    gripInflight = true
    const worker = getGripRasterWorker()

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data
      if (data && typeof data === 'object' && (data as { kind?: string }).kind === 'error') {
        gripInflight = false
        cleanup()
        reject(new Error(String((data as { message?: string }).message ?? 'grip raster failed')))
        return
      }
      const parsed = unwrapRasterWorkerPayload(data)
      if (parsed.progress) {
        options.onProgress?.(parsed.progress.phase, parsed.progress.percent)
        return
      }
      if (!parsed.result) return
      gripInflight = false
      cleanup()
      resolve(parsed.result)
    }

    const onError = (err: Event) => {
      gripInflight = false
      cleanup()
      reject(err)
    }

    const onMessageError = () => {
      gripInflight = false
      cleanup()
      reject(new Error('raster grip worker message error'))
    }

    function cleanup() {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError as EventListener)
      worker.removeEventListener('messageerror', onMessageError)
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError as EventListener)
    worker.addEventListener('messageerror', onMessageError)
    worker.postMessage(request)
  })
}
