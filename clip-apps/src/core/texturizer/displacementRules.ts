export interface DisplacementRuleInput {
  z: number
  baseDz: number
  maskedFrac: number
  isFaceExcluded: boolean
  isSealedBoundary: boolean
  bottomAngleLimit: number
  topAngleLimit: number
}

export interface DisplacementRuleOutput {
  dz: number
  nz: number
}

/**
 * Legacy-parity displacement gating:
 * - excluded/sealed vertices are pinned
 * - masked boundaries clamp Z direction to avoid crossing masked surface.
 */
export function resolveDisplacementRule(input: DisplacementRuleInput): DisplacementRuleOutput {
  const maskedFrac = Number.isFinite(input.maskedFrac) ? Math.max(0, Math.min(1, input.maskedFrac)) : 0
  const dz = (input.isFaceExcluded || input.isSealedBoundary) ? 0 : input.baseDz * (1 - maskedFrac)
  let nz = input.z + dz
  if (maskedFrac > 0) {
    if (input.bottomAngleLimit > 0 && nz < input.z) nz = input.z
    if (input.topAngleLimit > 0 && nz > input.z) nz = input.z
  }
  return { dz, nz }
}
