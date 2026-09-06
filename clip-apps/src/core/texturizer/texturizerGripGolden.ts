/**
 * Pinned outputs for the fixed 3-vertex regression mesh (planar XY mapping).
 * Update only when intentionally changing displacement/mapping behavior.
 */
export const TEXTURIZER_GRIP_GOLDEN_TRIANGLE = Object.freeze({
  vertexCount: 3,
  minDeltaZ: -0.25,
  maxDeltaZ: 0.25,
  vertexZ: Object.freeze([-0.25, -0.25, 0.25] as const),
  preTriCount: 1,
  postSubdivTriCount: 1,
  postDecimateTriCount: 1,
})

/** Grip UI defaults: triplanar (mode 5) on the same 3-vertex mesh, neutral grey texture. */
export const TEXTURIZER_GRIP_GOLDEN_TRIPLANAR = Object.freeze({
  vertexCount: 3,
  minDeltaZ: 0,
  maxDeltaZ: 0.25098039215686274,
  vertexZ: Object.freeze([0.250980406999588, 0.250980406999588, 0.250980406999588] as const),
  preTriCount: 1,
  postSubdivTriCount: 1,
  postDecimateTriCount: 1,
})

/** Planar mapping with subdivisionLevels=1 on the fixed triangle. */
export const TEXTURIZER_GRIP_GOLDEN_SUBDIV1 = Object.freeze({
  vertexCount: 12,
  preTriCount: 1,
  postSubdivTriCount: 4,
  postDecimateTriCount: 4,
} as const)

/** Planar mapping with subdivisionLevels=2 on the fixed triangle. */
export const TEXTURIZER_GRIP_GOLDEN_SUBDIV2 = Object.freeze({
  vertexCount: 48,
  preTriCount: 1,
  postSubdivTriCount: 16,
  postDecimateTriCount: 16,
} as const)

/** Grip cubic mapping (mode 6) on fixed triangle, neutral grey texture. */
export const TEXTURIZER_GRIP_GOLDEN_CUBIC = Object.freeze({
  vertexCount: 3,
  minDeltaZ: 0,
  maxDeltaZ: 0.25098039215686274,
  vertexZ: Object.freeze([0.250980406999588, 0.250980406999588, 0.250980406999588] as const),
  preTriCount: 1,
  postSubdivTriCount: 1,
  postDecimateTriCount: 1,
})
