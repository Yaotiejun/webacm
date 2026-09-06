import { isRasterGripBridgeEnabled } from '@/core/raster/rasterGripBridgePolicy'

let preloaded = false

/**
 * Warm grip raster worker when bridge is enabled (dev cold-start latency).
 */
export function preloadRasterGripWorker(): void {
  if (preloaded || !isRasterGripBridgeEnabled()) return
  if (typeof Worker === 'undefined') return
  preloaded = true
  try {
    const w = new Worker(new URL('@/workers/raster-grip.worker.ts', import.meta.url), { type: 'module' })
    setTimeout(() => {
      try {
        w.terminate()
      } catch {
        // ignore
      }
    }, 100)
  } catch {
    preloaded = false
  }
}

export function resetPreloadRasterGripWorkerForTests(): void {
  preloaded = false
}
