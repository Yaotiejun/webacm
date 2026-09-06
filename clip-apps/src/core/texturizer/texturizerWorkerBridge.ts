import type { TexturizeRequest, TexturizeResult, TexturizerRunStage } from '@/types/texturizer'
import { runTexturizerJobWithLegacyMapping } from './texturizerJobLegacy'

export interface RunTexturizerWorkerBridgeInput {
  req: TexturizeRequest
  onProgress?: (stage: TexturizerRunStage, progress: number, message?: string) => void
}

export function runTexturizerWorkerBridge(input: RunTexturizerWorkerBridgeInput): TexturizeResult {
  return runTexturizerJobWithLegacyMapping(input.req, input.onProgress)
}
