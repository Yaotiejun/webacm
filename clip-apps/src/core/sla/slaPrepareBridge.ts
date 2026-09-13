/**
 * SLA prepare bridge ? loads wasm/polyfill and exposes prepare contract used by legacy init-work.
 */
import {
  ensureSlaWasmMemory,
  loadSlaWasmRuntime,
  type SlaWasmLoadResult,
} from '@/core/sla/slaWasmRuntime'
import type { SlaWasmApi } from '@/core/sla/slaWasmPolyfill'

export type SlaPrepareResult = {
  ok: true
  runtime: SlaWasmLoadResult
  prepared: true
}

/**
 * Product-side sla_prepare: instantiate render/rle runtime (wasm or polyfill).
 * Does not require widgets ? that remains legacy Kiri print contract.
 */
export async function runSlaPrepare(opts?: {
  forcePolyfill?: boolean
  minMemory?: number
}): Promise<SlaPrepareResult> {
  const runtime = await loadSlaWasmRuntime({ forcePolyfill: opts?.forcePolyfill })
  ensureSlaWasmMemory(runtime.api, opts?.minMemory ?? 1024 * 1024)
  // Smoke: rle_encode empty-ish buffer
  const api = runtime.api
  api.heap[0] = 0xff
  api.heap[1] = 0x00
  const n = api.rle_encode(0, 0, 2, 0xff, 16, 0)
  if (n < 1) throw new Error('sla prepare rle_encode smoke failed')
  return { ok: true, runtime, prepared: true }
}

export function slaRleEncodeRaster(
  api: SlaWasmApi,
  raster: Uint8Array,
  opts?: { mask?: number; type?: number },
): Uint8Array {
  const mask = opts?.mask ?? 0xff
  const type = opts?.type ?? 0
  const need = raster.length * 2 + 64
  ensureSlaWasmMemory(api, need)
  api.heap.set(raster, 0)
  const outOff = raster.length + 16
  const len = api.rle_encode(0, 0, raster.length, mask, outOff, type)
  return api.heap.slice(outOff, outOff + len)
}
