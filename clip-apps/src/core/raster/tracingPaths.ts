import type { RasterTracingPath } from '@/types/raster'

export type TracingPathsParseErrorCode = 'root_not_array' | 'points_not_array' | 'point_not_xy'

export class TracingPathsParseError extends Error {
  code: TracingPathsParseErrorCode

  constructor(code: TracingPathsParseErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'TracingPathsParseError'
  }
}

function isPoint2D(value: unknown): value is [number, number] {
  if (!Array.isArray(value) || value.length < 2) return false
  const x = Number(value[0])
  const y = Number(value[1])
  return Number.isFinite(x) && Number.isFinite(y)
}

export function parseTracingPathsJson(raw: string): RasterTracingPath[] {
  const text = raw.trim()
  if (!text) return []
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new TracingPathsParseError('root_not_array', 'tracing paths 必须是数组')

  const out: RasterTracingPath[] = []
  for (let i = 0; i < parsed.length; i += 1) {
    const item = parsed[i]
    const pointsRaw = (item as { points?: unknown })?.points
    if (!Array.isArray(pointsRaw)) {
      throw new TracingPathsParseError('points_not_array', `tracing paths[${i}].points 必须是数组`)
    }
    const points: Array<[number, number]> = []
    for (let j = 0; j < pointsRaw.length; j += 1) {
      const pt = pointsRaw[j]
      if (!isPoint2D(pt)) {
        throw new TracingPathsParseError('point_not_xy', `tracing paths[${i}].points[${j}] 必须是 [x, y]`)
      }
      points.push([Number(pt[0]), Number(pt[1])])
    }
    out.push({ points })
  }
  return out
}
