import { decimateTrianglesClusteredDetailed } from './decimation'

export interface RunDecimationPassInput {
  vertices: Float32Array
  decimationRatio: number
  onProgress?: (p: number) => void
}

type DecimationDetailedResult = ReturnType<typeof decimateTrianglesClusteredDetailed>

export interface RunDecimationPassResult extends DecimationDetailedResult {
  elapsedMs: number
}

export function runDecimationPass(input: RunDecimationPassInput): RunDecimationPassResult {
  const t0 = performance.now()
  const result = decimateTrianglesClusteredDetailed(input.vertices, input.decimationRatio, input.onProgress)
  const elapsedMs = performance.now() - t0
  return { ...result, elapsedMs }
}
