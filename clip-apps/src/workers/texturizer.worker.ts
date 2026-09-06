/// <reference lib="webworker" />

import type { TexturizeRequest, TexturizerRunStage } from '@/types/texturizer'
import { runTexturizerWorkerBridge } from '@/core/texturizer/texturizerWorkerBridge'
import { buildTexturizerProgressEvent } from '@/core/texturizer/progressEvent'

declare const self: DedicatedWorkerGlobalScope

function emitProgress(stage: TexturizerRunStage, progress: number, message?: string) {
  self.postMessage(buildTexturizerProgressEvent(stage, progress, message))
}

self.onmessage = (ev: MessageEvent) => {
  const req = ev.data as TexturizeRequest
  const result = runTexturizerWorkerBridge({
    req,
    onProgress: (stage, progress, message) => emitProgress(stage, progress, message),
  })

  // Transfer the buffer back to main thread
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(postMessage as any)(result, [result.vertices.buffer])
}
