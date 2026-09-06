export interface MeshBounds3 {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
  center: { x: number; y: number; z: number }
  size: { x: number; y: number; z: number }
}

export function resolveMeshBounds(src: Float32Array): MeshBounds3 {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i] ?? 0
    const y = src[i + 1] ?? 0
    const z = src[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return {
    min: { x: minX, y: minY, z: minZ },
    max: { x: maxX, y: maxY, z: maxZ },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    size: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  }
}
