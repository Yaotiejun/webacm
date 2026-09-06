import type { TexturizeRequest, TexturizeResult, TexturizerRunStage } from '@/types/texturizer'
import { runTexturizerJob } from './texturizerJob'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error legacy JS module without types
import { computeUV, MODE_CUBIC } from './legacy/mapping.js'

export function runTexturizerJobWithLegacyMapping(
  req: TexturizeRequest,
  onProgress?: (stage: TexturizerRunStage, progress: number, message?: string) => void,
): TexturizeResult {
  return runTexturizerJob({
    req,
    defaultCubicMode: MODE_CUBIC,
    computeUvLegacy: computeUV,
    onProgress,
  })
}
