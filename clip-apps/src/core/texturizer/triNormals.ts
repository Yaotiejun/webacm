export function computeTriNormals(src: Float32Array): Float32Array {
  const triCount = Math.floor(src.length / 9)
  const out = new Float32Array(triCount * 3)
  for (let t = 0; t < triCount; t += 1) {
    const b = t * 9
    const ax = src[b] ?? 0
    const ay = src[b + 1] ?? 0
    const az = src[b + 2] ?? 0
    const bx = src[b + 3] ?? 0
    const by = src[b + 4] ?? 0
    const bz = src[b + 5] ?? 0
    const cx = src[b + 6] ?? 0
    const cy = src[b + 7] ?? 0
    const cz = src[b + 8] ?? 0
    const e1x = bx - ax
    const e1y = by - ay
    const e1z = bz - az
    const e2x = cx - ax
    const e2y = cy - ay
    const e2z = cz - az
    const nx = e1y * e2z - e1z * e2y
    const ny = e1z * e2x - e1x * e2z
    const nz = e1x * e2y - e1y * e2x
    const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    out[t * 3] = nx / nl
    out[t * 3 + 1] = ny / nl
    out[t * 3 + 2] = nz / nl
  }
  return out
}
