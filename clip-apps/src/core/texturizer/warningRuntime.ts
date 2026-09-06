import type { TexturizeWarning } from '@/types/texturizer'
import { createDecimationStrongerThanRequestedWarning, createSubdivSafetyCapHitWarning } from '@/core/texturizer/warningFactory'
import { getTexturizerConfig } from '@/core/texturizer/config'

export interface WarningRuntimeInput {
  subdivSafetyCapHit: boolean
  postSubdivTriCount: number
  postDecimateTriCount: number
  decimationRatio: number
}

export function buildRuntimeWarnings(input: WarningRuntimeInput): TexturizeWarning[] {
  const cfg = getTexturizerConfig()
  const warnings: TexturizeWarning[] = []
  if (input.subdivSafetyCapHit) {
    warnings.push(createSubdivSafetyCapHitWarning(input.postSubdivTriCount, cfg.safetyLimits.subdivSafetyTrianglesMax))
  }
  if (input.postSubdivTriCount > 0 && input.decimationRatio > cfg.warningRuleThresholds.decimationRatioWarnMin) {
    const kept = input.postDecimateTriCount / input.postSubdivTriCount
    if (kept < cfg.warningRuleThresholds.decimationKeptRatioWarnMax) {
      warnings.push(
        createDecimationStrongerThanRequestedWarning(
          input.decimationRatio,
          kept,
          input.postSubdivTriCount,
          input.postDecimateTriCount,
        ),
      )
    }
  }
  return warnings
}
