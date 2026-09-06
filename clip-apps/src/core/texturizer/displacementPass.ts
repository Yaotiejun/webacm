import { stepDisplacementVertex, type DisplacementVertexStepContext } from './displacementVertexStep'

export interface RunDisplacementPassResult {
  minDz: number
  maxDz: number
}

export interface RunDisplacementPassInput {
  src: Float32Array
  out: Float32Array
  ctx: DisplacementVertexStepContext
  vertexCount: number
  onProgress?: (progress: number) => void
}

export function runDisplacementPass(input: RunDisplacementPassInput): RunDisplacementPassResult {
  let minDz = 0
  let maxDz = 0
  let nextProgress = 0.1
  for (let i = 0; i < input.src.length; i += 3) {
    const { x, y, nz, dz } = stepDisplacementVertex(input.src, i, input.ctx)
    input.out[i] = x
    input.out[i + 1] = y
    input.out[i + 2] = nz
    if (dz < minDz) minDz = dz
    if (dz > maxDz) maxDz = dz
    if (input.onProgress) {
      const vIdx = Math.floor(i / 3)
      const p = vIdx / input.vertexCount
      if (p >= nextProgress) {
        input.onProgress(p)
        nextProgress += 0.1
      }
    }
  }
  return { minDz, maxDz }
}
