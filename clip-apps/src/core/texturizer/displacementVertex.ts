import { toCenteredGray } from './displacementMath'
import { resolveDisplacementRule, type DisplacementRuleInput, type DisplacementRuleOutput } from './displacementRules'

export interface ResolveVertexDisplacementInput extends Omit<DisplacementRuleInput, 'baseDz'> {
  grey01: number
  amplitude: number
  symmetricDisplacement: boolean
}

export interface ResolveVertexDisplacementOutput extends DisplacementRuleOutput {
  centeredGrey: number
  baseDz: number
}

export function resolveVertexDisplacement(input: ResolveVertexDisplacementInput): ResolveVertexDisplacementOutput {
  const centeredGrey = toCenteredGray(input.grey01, input.symmetricDisplacement)
  const baseDz = centeredGrey * input.amplitude
  const out = resolveDisplacementRule({
    z: input.z,
    baseDz,
    maskedFrac: input.maskedFrac,
    isFaceExcluded: input.isFaceExcluded,
    isSealedBoundary: input.isSealedBoundary,
    bottomAngleLimit: input.bottomAngleLimit,
    topAngleLimit: input.topAngleLimit,
  })
  return { centeredGrey, baseDz, dz: out.dz, nz: out.nz }
}
