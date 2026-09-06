import type { RasterResult } from '@/types/raster'

export type RasterWorkerProgressMessage = {
  kind: 'progress'
  phase: string
  percent: number
}

export type RasterWorkerResultMessage = {
  kind: 'result'
  result: RasterResult
}

export type RasterWorkerOutMessage = RasterWorkerProgressMessage | RasterWorkerResultMessage

export function isRasterWorkerProgressMessage(data: unknown): data is RasterWorkerProgressMessage {
  return !!data && typeof data === 'object' && (data as RasterWorkerProgressMessage).kind === 'progress'
}

export function isRasterWorkerResultMessage(data: unknown): data is RasterWorkerResultMessage {
  return !!data && typeof data === 'object' && (data as RasterWorkerResultMessage).kind === 'result'
}

/** Legacy worker posts bare `RasterResult` without wrapper. */
export function unwrapRasterWorkerPayload(data: unknown): {
  progress: RasterWorkerProgressMessage | null
  result: RasterResult | null
} {
  if (isRasterWorkerProgressMessage(data)) return { progress: data, result: null }
  if (isRasterWorkerResultMessage(data)) return { progress: null, result: data.result }
  if (data && typeof data === 'object' && Array.isArray((data as RasterResult).paths)) {
    return { progress: null, result: data as RasterResult }
  }
  return { progress: null, result: null }
}
