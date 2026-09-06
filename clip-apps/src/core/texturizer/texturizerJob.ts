import type { TexturizeRequest, TexturizeResult, TexturizerRunStage } from '@/types/texturizer'
import { runTexturizerPipeline } from './texturizerPipeline'
import { buildTexturizerPipelineInput } from './texturizerJobInput'

export interface RunTexturizerJobInput {
  req: TexturizeRequest
  defaultCubicMode: number
  computeUvLegacy: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: any,
    bounds: any,
  ) => unknown
  onProgress?: (stage: TexturizerRunStage, progress: number, message?: string) => void
}

export function runTexturizerJob(input: RunTexturizerJobInput): TexturizeResult {
  const pipelineInput = buildTexturizerPipelineInput({
    req: input.req,
    defaultCubicMode: input.defaultCubicMode,
    computeUvLegacy: input.computeUvLegacy,
    onProgress: input.onProgress,
  })
  return runTexturizerPipeline(pipelineInput)
}
