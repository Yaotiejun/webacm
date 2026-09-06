import { getTexturizerConfig } from '@/core/texturizer/config'
import type { TexturizerRunStage } from '@/types/texturizer'

/** Map per-stage worker progress (0–1) to overall run progress (0–1) using configured stage weights. */
export function toTexturizerOverallProgress(stage: TexturizerRunStage, stageProgress: number): number {
  const p = Math.max(0, Math.min(1, stageProgress))
  const w = getTexturizerConfig().progressStageWeights
  const ws = Math.max(0, w.subdivision)
  const wd = Math.max(0, w.displacement)
  const wc = Math.max(0, w.decimation)
  const wf = Math.max(0, w.finalize)
  const sum = ws + wd + wc + wf
  if (sum <= 1e-8) return p
  const s0 = 0
  const s1 = ws / sum
  const s2 = (ws + wd) / sum
  const s3 = (ws + wd + wc) / sum
  if (stage === 'subdivision') return s0 + p * (s1 - s0)
  if (stage === 'displacement') return s1 + p * (s2 - s1)
  if (stage === 'decimation') return s2 + p * (s3 - s2)
  return s3 + p * (1 - s3)
}

export function texturizerStageLabel(stage: string | null | undefined): string {
  if (stage === 'subdivision') return '细分'
  if (stage === 'displacement') return '位移'
  if (stage === 'decimation') return '简化'
  if (stage === 'finalize') return '收尾'
  if (stage === 'start') return '启动'
  return '处理中'
}
