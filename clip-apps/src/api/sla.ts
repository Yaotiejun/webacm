/**
 * SLA job API - prefers dedicated Worker; sync fallback for Node/vitest.
 * UI slice uses mode=preview (contours only); download uses export-layers.
 */
import {
  exportSlaFromLayers,
  runSlaFromMesh,
  type SlaEngineOpts,
  type SlaEngineResult,
} from '@/core/sla/slaEngine'
import type { SlaLayer } from '@/core/sla/slaLayers'
import type { SlaWorkerRequest, SlaWorkerResponse } from '@/core/sla/slaWorkerProtocol'

const SlaWorkerURL = new URL('../workers/sla.worker.ts', import.meta.url)

export type SlaJobOpts = SlaEngineOpts & {
  forceSync?: boolean
}

function canUseWorker(forceSync?: boolean): boolean {
  if (forceSync) return false
  if (typeof Worker === 'undefined') return false
  if (typeof process !== 'undefined' && process.env?.VITEST) return false
  return true
}

function runWorker(request: SlaWorkerRequest, transfer?: Transferable[]): Promise<SlaEngineResult> {
  const worker = new Worker(SlaWorkerURL, { type: 'module' })
  return new Promise<SlaEngineResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate()
      reject(new Error('SLA worker timeout (90s) — try a smaller mesh or disable supports'))
    }, 90_000)
    worker.onmessage = (ev: MessageEvent<SlaWorkerResponse>) => {
      clearTimeout(timer)
      worker.terminate()
      const data = ev.data
      if (data.ok) resolve(data.result)
      else reject(new Error(data.error || 'sla worker error'))
    }
    worker.onerror = (err) => {
      clearTimeout(timer)
      worker.terminate()
      reject(err instanceof Error ? err : new Error(String(err)))
    }
    worker.onmessageerror = () => {
      clearTimeout(timer)
      worker.terminate()
      reject(new Error('sla worker message error'))
    }
    if (transfer?.length) worker.postMessage(request, transfer)
    else worker.postMessage(request)
  })
}

export async function submitSlaJob(
  vertices: Float32Array,
  opts: SlaJobOpts,
): Promise<SlaEngineResult> {
  const { forceSync, ...engineOpts } = opts
  // UI defaults to preview when unspecified
  const mode = engineOpts.mode ?? 'preview'
  const finalOpts: SlaEngineOpts = { ...engineOpts, mode }
  if (!canUseWorker(forceSync)) {
    return runSlaFromMesh(vertices, finalOpts)
  }
  const request: SlaWorkerRequest = {
    task: 'slice-mesh',
    vertices,
    opts: finalOpts,
  }
  return runWorker(request, [vertices.buffer])
}

/** Export device file from already-sliced layers (Kiri export step). */
export async function submitSlaExport(
  layers: SlaLayer[],
  opts: SlaJobOpts,
): Promise<SlaEngineResult> {
  const { forceSync, ...engineOpts } = opts
  const finalOpts: SlaEngineOpts = { ...engineOpts, mode: 'export' }
  if (!canUseWorker(forceSync)) {
    return exportSlaFromLayers(layers, finalOpts)
  }
  const request: SlaWorkerRequest = {
    task: 'export-layers',
    layers,
    opts: finalOpts,
  }
  return runWorker(request)
}
