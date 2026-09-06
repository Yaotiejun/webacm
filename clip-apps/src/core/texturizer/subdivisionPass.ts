import { subdivideTrianglesAdaptive } from './subdivision'

export interface RunSubdivisionPassInput {
  vertices: Float32Array
  levels: number
  triExcluded: Uint8Array
  onProgress?: (p: number) => void
}

export interface RunSubdivisionPassResult {
  vertices: Float32Array
  triExcluded: Uint8Array
  safetyCapHit: boolean
  elapsedMs: number
}

export function runSubdivisionPass(input: RunSubdivisionPassInput): RunSubdivisionPassResult {
  const t0 = performance.now()
  if ((input.levels ?? 0) <= 0) {
    return {
      vertices: input.vertices,
      triExcluded: input.triExcluded,
      safetyCapHit: false,
      elapsedMs: 0,
    }
  }
  const subdiv = subdivideTrianglesAdaptive(
    input.vertices,
    input.levels,
    input.onProgress,
    { triExcluded: input.triExcluded },
  )
  const elapsedMs = performance.now() - t0
  return {
    vertices: subdiv.vertices,
    triExcluded: subdiv.triExcludedOut,
    safetyCapHit: subdiv.safetyCapHit,
    elapsedMs,
  }
}
