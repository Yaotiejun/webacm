/**
 * SLA slice Worker — TS engine off main thread + optional sla_prepare (timeout).
 */
import {
  exportSlaFromLayers,
  runSlaFromMesh,
  type SlaEngineResult,
} from '@/core/sla/slaEngine'
import { runSlaPrepare } from '@/core/sla/slaPrepareBridge'
import type { SlaWorkerRequest, SlaWorkerResponse } from '@/core/sla/slaWorkerProtocol'

let prepareTried = false
let prepareOk = false
let wasmSource: 'wasm' | 'polyfill' | 'none' = 'none'

async function ensurePrepare(): Promise<void> {
  if (prepareTried) return
  prepareTried = true
  try {
    const prep = await Promise.race([
      runSlaPrepare(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('sla_prepare timeout')), 4000)
      }),
    ])
    prepareOk = prep.ok
    wasmSource = prep.runtime.source
  } catch {
    prepareOk = false
    wasmSource = 'none'
  }
}

function replyOk(result: SlaEngineResult) {
  const res: SlaWorkerResponse = {
    ok: true,
    result: { ...result, backend: 'sla-worker' },
    wasmTried: prepareTried,
    wasmOk: prepareOk && wasmSource === 'wasm',
    prepareOk,
    wasmSource,
  }
  ;(self as DedicatedWorkerGlobalScope).postMessage(res)
}

function replyErr(e: unknown) {
  const res: SlaWorkerResponse = {
    ok: false,
    error: e instanceof Error ? e.message : String(e),
  }
  ;(self as DedicatedWorkerGlobalScope).postMessage(res)
}

self.onmessage = async (ev: MessageEvent<SlaWorkerRequest>) => {
  const msg = ev.data
  try {
    // Prepare is optional; never block slice on wasm
    void ensurePrepare()
    if (msg.task === 'slice-mesh') {
      if (!msg.vertices?.length) throw new Error('missing vertices')
      const sliced = await runSlaFromMesh(msg.vertices, msg.opts)
      replyOk(sliced)
      return
    }
    if (msg.task === 'export-layers') {
      if (!msg.layers?.length) throw new Error('missing layers')
      const exported = await exportSlaFromLayers(msg.layers, { ...msg.opts, mode: 'export' })
      replyOk(exported)
      return
    }
    throw new Error('unknown sla worker task')
  } catch (e) {
    replyErr(e)
  }
}
