import type { DisplacementVertexStepContext } from './displacementVertexStep'

export function makeComputeUvAdapter(
  computeUvLegacy: (
    point: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    mappingMode: number,
    settings: any,
    bounds: any,
  ) => unknown,
): DisplacementVertexStepContext['computeUV'] {
  return (point, normal, mappingMode, settings, bounds) => computeUvLegacy(point, normal, mappingMode, settings as any, bounds as any)
}
