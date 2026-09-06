import type { TexturizeRequest, TexturizeResult, TexturizerProgressEvent } from '@/types/texturizer'

let texturizerWorker: Worker | null = null
let inflight = false

function getTexturizerWorker() {
  if (texturizerWorker) return texturizerWorker
  texturizerWorker = new Worker(new URL('@/workers/texturizer.worker.ts', import.meta.url), {
    type: 'module',
  })
  return texturizerWorker
}

/** Terminates the singleton worker and clears in-flight state (Vitest isolation / dev only). */
export function resetTexturizerWorkerStateForTests(): void {
  if (texturizerWorker) {
    try {
      texturizerWorker.terminate()
    } catch {
      // ignore
    }
    texturizerWorker = null
  }
  inflight = false
}

export function runTexturizer(
  request: TexturizeRequest,
  options?: { onProgress?: (ev: TexturizerProgressEvent) => void },
): Promise<TexturizeResult> {
  return new Promise((resolve, reject) => {
    if (inflight) {
      reject(new Error('Texturizer worker is busy; please retry'))
      return
    }
    inflight = true
    const worker = getTexturizerWorker()

    const payload: TexturizeRequest = {
      ...request,
      vertices: new Float32Array(request.vertices),
      texture: request.texture
        ? {
            width: request.texture.width,
            height: request.texture.height,
            gray: new Uint8Array(request.texture.gray),
          }
        : undefined,
    }

    const transfer: Transferable[] = [payload.vertices.buffer]
    if (payload.texture?.gray) transfer.push(payload.texture.gray.buffer)
    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as TexturizerProgressEvent | TexturizeResult
      if (data && typeof data === 'object' && (data as TexturizerProgressEvent).kind === 'progress') {
        options?.onProgress?.(data as TexturizerProgressEvent)
        return
      }
      inflight = false
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError as EventListener)
      worker.removeEventListener('messageerror', onMessageError)
      resolve(data as TexturizeResult)
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
      reject(new Error('texturizer worker message error'))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError as EventListener)
    worker.addEventListener('messageerror', onMessageError)
    worker.postMessage(payload, transfer)
  })
}
