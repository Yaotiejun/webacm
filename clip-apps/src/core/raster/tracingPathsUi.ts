import { TracingPathsParseError } from './tracingPaths'

const TRACING_PARSE_ERROR_LABELS: Record<string, string> = {
  root_not_array: '根结构必须是数组',
  points_not_array: '每条路径的 points 必须是数组',
  point_not_xy: 'points 中每个点必须是 [x, y] 数字坐标',
}

export function getTracingPathsParseErrorLabel(err: unknown): string {
  if (err instanceof TracingPathsParseError) {
    return TRACING_PARSE_ERROR_LABELS[err.code] ?? err.message
  }
  if (err instanceof Error) return err.message
  return String(err)
}
