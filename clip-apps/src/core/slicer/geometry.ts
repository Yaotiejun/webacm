export interface VertexBounds3D {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

export function computeVertexBounds3D(vertices: Float32Array): VertexBounds3D | null {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    const x = vertices[i]
    const y = vertices[i + 1]
    const z = vertices[i + 2]
    if (x === undefined || y === undefined || z === undefined) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(minZ)) return null
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export function pointsFromVertices(vertices: Float32Array, newPoint: (x: number, y: number, z: number) => any): any[] {
  const pts: any[] = []
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    const x = vertices[i]
    const y = vertices[i + 1]
    const z = vertices[i + 2]
    if (x === undefined || y === undefined || z === undefined) continue
    pts.push(newPoint(x, y, z))
  }
  return pts
}
