import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import type { SliceResult } from '@/api/slice'
import { submitSliceJob, type SliceSubmitOptions } from '@/api/slice'

export type SliceBackendKind = 'mock' | 'kiri'

export interface SliceBackend {
  kind: SliceBackendKind
  slice(job: SliceJobPayload, vertices: Float32Array, process: FdmProcess, options?: SliceSubmitOptions): Promise<SliceResult>
}

export const MockSliceBackend: SliceBackend = {
  kind: 'mock',
  slice: (job, vertices, process, options) => submitSliceJob(job, vertices, process, 'mock', options),
}

// Same worker pipeline as the FDM UI: `submitSliceJob(..., 'kiri')` runs the slicer worker with the
// Kiri legacy path (and mock fallback / telemetry) — not the lightweight mock-only backend.
export const KiriSliceBackend: SliceBackend = {
  kind: 'kiri',
  slice: (job, vertices, process, options) => submitSliceJob(job, vertices, process, 'kiri', options),
}

export function getSliceBackend(kind: SliceBackendKind): SliceBackend {
  return kind === 'kiri' ? KiriSliceBackend : MockSliceBackend
}
