/** Summarize displaced mesh Z range from a texturizer result vertex buffer. */
export function texturizerVertexZStats(vertices: Float32Array, originalZ?: Float32Array): {
  minZ: number
  maxZ: number
  minDeltaZ: number
  maxDeltaZ: number
} {
  let minZ = Infinity
  let maxZ = -Infinity
  let minDeltaZ = Infinity
  let maxDeltaZ = -Infinity
  for (let i = 2; i < vertices.length; i += 3) {
    const z = vertices[i]!
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
    if (originalZ) {
      const d = z - (originalZ[i] ?? 0)
      if (d < minDeltaZ) minDeltaZ = d
      if (d > maxDeltaZ) maxDeltaZ = d
    }
  }
  if (!Number.isFinite(minZ)) minZ = 0
  if (!Number.isFinite(maxZ)) maxZ = 0
  if (!Number.isFinite(minDeltaZ)) minDeltaZ = 0
  if (!Number.isFinite(maxDeltaZ)) maxDeltaZ = 0
  return { minZ, maxZ, minDeltaZ, maxDeltaZ }
}
