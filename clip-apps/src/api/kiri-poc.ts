import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import { clonePlain } from '@/core/clonePlain'
import { sanitizeJobForWorker } from '@/api/slice'

const KiriPocWorkerURL = new URL('../workers/kiri-poc.worker.ts', import.meta.url)

export interface KiriPocRequest {
  job: SliceJobPayload
  vertices: Float32Array
  process: FdmProcess
}

export interface KiriPocLayerInfo {
  z: number
  lineCount: number
  groupCount?: number
}

export interface KiriPocResult {
  ok: true
  layerCount: number
  layers: KiriPocLayerInfo[]
}

export interface KiriPocError {
  ok: false
  error: string
}

type WorkerResponse = KiriPocResult | KiriPocError

export async function runKiriPoc(
  job: SliceJobPayload,
  vertices: Float32Array,
  process: FdmProcess,
): Promise<KiriPocResult> {
  const worker = new Worker(KiriPocWorkerURL, { type: 'module' })

  return new Promise<KiriPocResult>((resolve, reject) => {
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const data = ev.data
      worker.terminate()
      if (data.ok) {
        resolve(data)
      } else {
        reject(new Error(data.error))
      }
    }

    worker.onerror = (ev: ErrorEvent) => {
      worker.terminate()
      reject(new Error(ev.message || 'kiri poc worker error'))
    }

    worker.onmessageerror = () => {
      worker.terminate()
      reject(new Error('kiri poc worker message error'))
    }

    const req: KiriPocRequest = { job: sanitizeJobForWorker(job), vertices, process: clonePlain(process) }
    worker.postMessage(req, [vertices.buffer])
  })
}
