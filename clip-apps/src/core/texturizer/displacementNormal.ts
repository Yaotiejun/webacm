import type { Vec3Map } from './displacementAccumulators'

export interface ResolveVertexNormalInput {
  key: string
  triIdx: number
  vertexOffset: number
  smoothNrmMap: Vec3Map
  normals?: Float32Array
  triNormals?: Float32Array | null
}

export function resolveVertexNormal(input: ResolveVertexNormalInput): { x: number; y: number; z: number } {
  const smooth = input.smoothNrmMap.get(input.key)
  const nx = smooth ? smooth[0] : (input.normals ? (input.normals[input.vertexOffset] ?? 0) : (input.triNormals?.[input.triIdx * 3] ?? 0))
  const ny = smooth ? smooth[1] : (input.normals ? (input.normals[input.vertexOffset + 1] ?? 0) : (input.triNormals?.[input.triIdx * 3 + 1] ?? 0))
  const nz = smooth ? smooth[2] : (input.normals ? (input.normals[input.vertexOffset + 2] ?? 1) : (input.triNormals?.[input.triIdx * 3 + 2] ?? 1))
  const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  return { x: nx / nLen, y: ny / nLen, z: nz / nLen }
}
