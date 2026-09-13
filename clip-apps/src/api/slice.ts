import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import { clonePlain } from '@/core/clonePlain'

export type PathType = 'perimeter' | 'infill' | 'support' | 'travel'

export interface SlicePath2D {
  type: PathType
  points: Array<[number, number]>
}

export interface SliceLayerPreview {
  z: number
  paths: SlicePath2D[]
}

export interface SlicePreviewData {
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  layers: SliceLayerPreview[]
}

/** Geometry sent into the slicer (for logs, UI, migration parity). */
export interface SliceInputMeta {
  vertexCount: number
  triangleCount: number
  planarBounds: SlicePreviewData['bounds']
  zSpanMm: number
}

/** Worker/runtime snapshot after a slice (grip legacy migration / diagnostics). */
export interface SliceLegacyDebugSnapshot {
  ready: boolean
  initErrorMessage: string | null
  hasSliceImpl: boolean
  hasPrepareImpl?: boolean
  hasExportImpl?: boolean
  legacyImportErrorMessage: string | null
}

export interface SliceResultSummary {
  layers: number
  timeMinutes: number
  filamentMm: number
  estimateMeta?: {
    lengths: {
      perimeter: number
      infill: number
      support: number
      travelInLayer: number
      travelInterLayer: number
    }
    retract: {
      triggerDistance: number
      travelSegments: number
      interLayerSegments: number
      estimatedCount: number
    }
    timeSec: {
      print: number
      travel: number
      retract: number
      floor: number
      final: number
    }
  }
}

export type SliceFallbackReasonCode =
  | 'legacy_disabled'
  | 'runtime_init_error'
  | 'runtime_not_ready'
  | 'legacy_impl_missing'
  | 'legacy_slice_timeout'
  | 'legacy_slice_reentry'
  | 'legacy_slice_failed'

export interface SliceResult {
  summary: SliceResultSummary
  preview: SlicePreviewData
  inputMeta?: SliceInputMeta
  backend?: SliceBackendKind
  /**
   * Machine-oriented G-code when available (legacy preview-path export or future fdm_export).
   * Prefer this for export / device send over UI-built stubs.
   */
  gcodeText?: string
  /** How `gcodeText` was produced. */
  gcodeSource?: 'legacy-preview-path' | 'placeholder-empty' | 'legacy-fdm-export' | 'mock'
  /** Present when slice ran in worker with `kiriEngine` (Kiri path or mock fallback after Kiri attempt). */
  legacyDebug?: SliceLegacyDebugSnapshot
  fallback?: {
    reasonCode: SliceFallbackReasonCode
    warningCode?: `slicer_${string}`
    message: string
  } | null
}

const SlicerWorkerURL = new URL('../workers/slicer.worker.ts', import.meta.url)

import type { SliceBackendKind } from '@/api/slice-backend'
import type { SliceFallbackTelemetryEvent } from '@/core/slicer/sliceTelemetry'
import {
  normalizeSliceModelMeshes,
  type SliceGeometryInput,
} from '@/core/slicer/sliceModelMeshes'

export type { SliceGeometryInput, SliceModelMesh } from '@/core/slicer/sliceModelMeshes'

export type SliceTelemetryEvent = SliceFallbackTelemetryEvent

export interface SliceSubmitOptions {
  onTelemetry?: (event: SliceTelemetryEvent) => void
}

type WorkerResponse =
  | { kind: 'telemetry'; event: SliceTelemetryEvent }
  | { ok: true; result: SliceResult; backend: SliceBackendKind }
  | { ok: false; error?: string }

/** Plain **`SliceJobPayload`** for worker postMessage (drops unknown keys, deep-clones models / bounds). */
export function sanitizeJobForWorker(job: SliceJobPayload): SliceJobPayload {
  // Ensure we only pass plain data structures to the worker.
  // (Avoid File / Blob / Three.js objects / reactive proxies)
  return {
    id: job.id,
    name: job.name,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    mode: job.mode,
    device: job.device,
    process: job.process,
    material: job.material,
    models: job.models.map((m) => ({
      id: m.id,
      name: m.name,
      ext: m.ext,
      transform: clonePlain(m.transform),
      bbox: clonePlain(m.bbox),
      extruder: Number.isFinite(m.extruder) ? Math.max(0, Math.floor(Number(m.extruder))) : 0,
    })),
    jobBounds: job.jobBounds ? clonePlain(job.jobBounds) : undefined,
  }
}

export async function submitSliceJob(
  job: SliceJobPayload,
  geometry: SliceGeometryInput,
  process: FdmProcess,
  backendKind: SliceBackendKind,
  options?: SliceSubmitOptions,
): Promise<SliceResult> {
  const worker = new Worker(SlicerWorkerURL, { type: 'module' })

  // Guard against DataCloneError when job/process accidentally carry non-cloneable fields.
  const safeJob = sanitizeJobForWorker(job)
  const safeProcess = clonePlain(process)
  const modelMeshes = normalizeSliceModelMeshes(geometry, safeJob)
  if (!modelMeshes.length) {
    return Promise.reject(new Error('missing vertices for slicing'))
  }
  const transferables = modelMeshes.map((m) => m.vertices.buffer)

  return new Promise<SliceResult>((resolve, reject) => {
    worker.onmessage = (ev: MessageEvent) => {
      const data = ev.data as WorkerResponse
      if ('kind' in data && data.kind === 'telemetry') {
        options?.onTelemetry?.(data.event)
        return
      }
      worker.terminate()
      if ('ok' in data && data.ok) {
        resolve(data.result)
      } else {
        reject(new Error(('error' in data && data.error) || 'slice worker error'))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    worker.onmessageerror = () => {
      worker.terminate()
      reject(new Error('slice worker message error'))
    }

    worker.postMessage(
      { job: safeJob, modelMeshes, process: safeProcess, backendKind },
      transferables,
    )
  })
}
