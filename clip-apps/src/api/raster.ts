import type { RasterRequest, RasterResult } from '@/types/raster'
import { unwrapRasterWorkerPayload } from '@/core/raster/rasterWorkerProtocol'
import { shouldRunRasterViaGripBridge } from '@/core/raster/rasterGripBridgePolicy'
import { resetRasterGripWorkerStateForTests, runRasterGripBridge } from '@/api/rasterGrip'

export type { RunRasterOptions } from '@/api/rasterGrip'
import type { RunRasterOptions } from '@/api/rasterGrip'

let rasterWorker: Worker | null = null
let inflight = false

function getRasterWorker() {
  if (rasterWorker) return rasterWorker
  rasterWorker = new Worker(new URL('@/workers/raster.worker.ts', import.meta.url), {
    type: 'module',
  })
  return rasterWorker
}

/** Terminates the singleton worker and clears in-flight state (Vitest isolation / dev only). */
export function resetRasterWorkerStateForTests(): void {
  if (rasterWorker) {
    try {
      rasterWorker.terminate()
    } catch {
      // ignore
    }
    rasterWorker = null
  }
  inflight = false
  resetRasterGripWorkerStateForTests()
}

export function runRaster(request: RasterRequest, options: RunRasterOptions = {}): Promise<RasterResult> {
  if (shouldRunRasterViaGripBridge(request.config.mode)) {
    return runRasterGripBridge(request, options)
  }
  return new Promise((resolve, reject) => {
    if (inflight) {
      reject(new Error('Raster worker is busy; please retry'))
      return
    }
    inflight = true
    const worker = getRasterWorker()

    const onMessage = (ev: MessageEvent) => {
      const parsed = unwrapRasterWorkerPayload(ev.data)
      if (parsed.progress) {
        options.onProgress?.(parsed.progress.phase, parsed.progress.percent)
        return
      }
      if (!parsed.result) return
      inflight = false
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError as EventListener)
      worker.removeEventListener('messageerror', onMessageError)
      resolve(parsed.result)
    }

    const onError = (err: Event) => {
      inflight = false
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError as EventListener)
      worker.removeEventListener('messageerror', onMessageError)
      reject(err)
    }

    const onMessageError = () => {
      inflight = false
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError as EventListener)
      worker.removeEventListener('messageerror', onMessageError)
      reject(new Error('raster worker message error'))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError as EventListener)
    worker.addEventListener('messageerror', onMessageError)
    worker.postMessage(request)
  })
}
