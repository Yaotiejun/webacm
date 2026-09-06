/// <reference lib="webworker" />

import type { RasterRequest } from '@/types/raster'
import type { RasterWorkerResultMessage } from '@/core/raster/rasterWorkerProtocol'
import { runRasterGripBridgeCore } from '@/core/raster/rasterGripBridgeRunner'

declare const self: DedicatedWorkerGlobalScope

function postRasterProgress(phase: string, percent: number) {
  postMessage({ kind: 'progress', phase, percent })
}

function postRasterResult(result: RasterWorkerResultMessage['result']) {
  postMessage({ kind: 'result', result } satisfies RasterWorkerResultMessage)
}

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data as RasterRequest
  try {
    const result = await runRasterGripBridgeCore(data, postRasterProgress)
    postRasterResult(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    postMessage({ kind: 'error', message: `grip raster bridge: ${message}` })
  }
}
