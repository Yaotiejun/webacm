/**
 * SLA worker protocol: slice-mesh (preview/export) + export-layers.
 */
import type { SlaEngineOpts, SlaEngineResult } from '@/core/sla/slaEngine'
import type { SlaLayer } from '@/core/sla/slaLayers'

export type SlaWorkerRequest =
  | {
      task: 'slice-mesh'
      vertices: Float32Array
      opts: SlaEngineOpts
    }
  | {
      task: 'export-layers'
      layers: SlaLayer[]
      opts: SlaEngineOpts
    }

export type SlaWorkerResponse =
  | {
      ok: true
      result: SlaEngineResult
      wasmTried: boolean
      wasmOk: boolean
      prepareOk?: boolean
      wasmSource?: 'wasm' | 'polyfill' | 'none'
    }
  | { ok: false; error: string }
