import type { TexturizerProgressEvent, TexturizerRunStage } from '@/types/texturizer'

export function buildTexturizerProgressEvent(stage: TexturizerRunStage, progress: number, message?: string): TexturizerProgressEvent {
  return {
    kind: 'progress',
    stage,
    progress: Math.max(0, Math.min(1, progress)),
    message,
  }
}
