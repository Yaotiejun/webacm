import { getTexturizerConfig } from './config'
import { posKey } from './positionKey'

function edgeKey(ax: number, ay: number, az: number, bx: number, by: number, bz: number): string {
  const ak = posKey(ax, ay, az)
  const bk = posKey(bx, by, bz)
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`
}

function longestEdgeLen(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number): number {
  const abx = ax - bx
  const aby = ay - by
  const abz = az - bz
  const bcx = bx - cx
  const bcy = by - cy
  const bcz = bz - cz
  const cax = cx - ax
  const cay = cy - ay
  const caz = cz - az
  const ab = Math.sqrt(abx * abx + aby * aby + abz * abz)
  const bc = Math.sqrt(bcx * bcx + bcy * bcy + bcz * bcz)
  const ca = Math.sqrt(cax * cax + cay * cay + caz * caz)
  return Math.max(ab, bc, ca)
}

function getBoundsScale(vertices: Float32Array): number {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i] ?? 0
    const y = vertices[i + 1] ?? 0
    const z = vertices[i + 2] ?? 0
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  return Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-6)
}

/** Per-triangle user exclusion (1 = excluded) aligned with legacy `faceExcluded` marking rules. */
export interface SubdivideTrianglesAdaptiveOptions {
  /**
   * Length must be >= triangle count of the current `vertices` (only the first pass reads it;
   * later passes use flags propagated from splits). Excluded triangles do not add their own
   * edges to the global split set (saves density in masked regions); shared edges can still be
   * marked by non-excluded neighbors, so excluded faces may still subdivide on a boundary.
   */
  triExcluded?: Uint8Array
}

export interface SubdivideTrianglesAdaptiveResult {
  vertices: Float32Array
  safetyCapHit: boolean
  /** Per-triangle user exclusion (1 = excluded) for the returned mesh; same length as `vertices.length / 9`. */
  triExcludedOut: Uint8Array
}

export function subdivideTrianglesAdaptive(
  vertices: Float32Array,
  levels: number,
  onProgress?: (progress: number) => void,
  options?: SubdivideTrianglesAdaptiveOptions,
): SubdivideTrianglesAdaptiveResult {
  const subdivSafetyTrianglesMax = getTexturizerConfig().safetyLimits.subdivSafetyTrianglesMax
  const lv = Math.max(0, Math.min(3, Math.floor(levels)))
  if (lv <= 0) {
    const n = Math.floor(vertices.length / 9)
    const triExcludedOut = new Uint8Array(n)
    if (options?.triExcluded && options.triExcluded.length >= n) {
      for (let i = 0; i < n; i += 1) triExcludedOut[i] = options.triExcluded[i] ? 1 : 0
    }
    return { vertices, safetyCapHit: false, triExcludedOut }
  }
  const clamp01 = (x: number) => (x > 1 ? 1 : x < 0 ? 0 : x)
  let current = vertices
  let safetyCapHit = false
  const baseSize = getBoundsScale(vertices)
  let edgeThreshold = baseSize / (12 * Math.max(1, lv))
  onProgress?.(0.02)
  let faceExcl = new Uint8Array(0)

  for (let iter = 0; iter < lv; iter += 1) {
    const triCount = Math.floor(current.length / 9)
    if (faceExcl.length !== triCount) {
      faceExcl = new Uint8Array(triCount)
      if (iter === 0 && options?.triExcluded && options.triExcluded.length >= triCount) {
        for (let i = 0; i < triCount; i += 1) {
          faceExcl[i] = options.triExcluded[i] ? 1 : 0
        }
      }
    }
    if (triCount >= subdivSafetyTrianglesMax) {
      safetyCapHit = true
      onProgress?.(clamp01(0.02 + ((iter + 1) / lv) * 0.96))
      break
    }
    const levelLo = 0.02 + (iter / lv) * 0.96
    const levelHi = 0.02 + ((iter + 1) / lv) * 0.96
    const span = levelHi - levelLo
    const triDenom = Math.max(1, triCount - 1)
    const scanStride = Math.max(1, Math.floor(triCount / 28))

    const splitEdges = new Set<string>()
    for (let t = 0; t < triCount; t += 1) {
      if (faceExcl[t]) continue
      const b = t * 9
      const ax = current[b] ?? 0
      const ay = current[b + 1] ?? 0
      const az = current[b + 2] ?? 0
      const bx = current[b + 3] ?? 0
      const by = current[b + 4] ?? 0
      const bz = current[b + 5] ?? 0
      const cx = current[b + 6] ?? 0
      const cy = current[b + 7] ?? 0
      const cz = current[b + 8] ?? 0
      if (longestEdgeLen(ax, ay, az, bx, by, bz, cx, cy, cz) <= edgeThreshold) continue
      const ab = edgeKey(ax, ay, az, bx, by, bz)
      const bc = edgeKey(bx, by, bz, cx, cy, cz)
      const ca = edgeKey(cx, cy, cz, ax, ay, az)
      splitEdges.add(ab)
      splitEdges.add(bc)
      splitEdges.add(ca)
      if (t % scanStride === 0 || t === triCount - 1) {
        onProgress?.(clamp01(levelLo + span * 0.38 * (t / triDenom)))
      }
    }
    if (!splitEdges.size) {
      onProgress?.(clamp01(levelHi))
      break
    }

    const out: number[] = []
    const nextExcl: number[] = []
    const midCache = new Map<string, [number, number, number]>()
    let changed = false
    for (let t = 0; t < triCount; t += 1) {
      if (out.length / 9 >= subdivSafetyTrianglesMax) {
        safetyCapHit = true
        break
      }
      const b = t * 9
      const ax = current[b] ?? 0
      const ay = current[b + 1] ?? 0
      const az = current[b + 2] ?? 0
      const bx = current[b + 3] ?? 0
      const by = current[b + 4] ?? 0
      const bz = current[b + 5] ?? 0
      const cx = current[b + 6] ?? 0
      const cy = current[b + 7] ?? 0
      const cz = current[b + 8] ?? 0
      const kAB = edgeKey(ax, ay, az, bx, by, bz)
      const kBC = edgeKey(bx, by, bz, cx, cy, cz)
      const kCA = edgeKey(cx, cy, cz, ax, ay, az)
      const sAB = splitEdges.has(kAB)
      const sBC = splitEdges.has(kBC)
      const sCA = splitEdges.has(kCA)
      const splitN = (sAB ? 1 : 0) + (sBC ? 1 : 0) + (sCA ? 1 : 0)

      const getMid = (
        key: string,
        px: number,
        py: number,
        pz: number,
        qx: number,
        qy: number,
        qz: number,
      ): [number, number, number] => {
        const m = midCache.get(key)
        if (m) return m
        const next: [number, number, number] = [(px + qx) * 0.5, (py + qy) * 0.5, (pz + qz) * 0.5]
        midCache.set(key, next)
        return next
      }

      const ex = faceExcl[t] ? 1 : 0

      if (splitN === 0) {
        out.push(ax, ay, az, bx, by, bz, cx, cy, cz)
        nextExcl.push(ex)
        continue
      }

      changed = true
      if (splitN === 3) {
        const [mabx, maby, mabz] = getMid(kAB, ax, ay, az, bx, by, bz)
        const [mbcx, mbcy, mbcz] = getMid(kBC, bx, by, bz, cx, cy, cz)
        const [mcax, mcay, mcaz] = getMid(kCA, cx, cy, cz, ax, ay, az)
        out.push(
          ax, ay, az, mabx, maby, mabz, mcax, mcay, mcaz,
          mabx, maby, mabz, bx, by, bz, mbcx, mbcy, mbcz,
          mcax, mcay, mcaz, mbcx, mbcy, mbcz, cx, cy, cz,
          mabx, maby, mabz, mbcx, mbcy, mbcz, mcax, mcay, mcaz,
        )
        nextExcl.push(ex, ex, ex, ex)
        continue
      }

      if (splitN === 1) {
        if (sAB) {
          const [mx, my, mz] = getMid(kAB, ax, ay, az, bx, by, bz)
          out.push(ax, ay, az, mx, my, mz, cx, cy, cz, mx, my, mz, bx, by, bz, cx, cy, cz)
        } else if (sBC) {
          const [mx, my, mz] = getMid(kBC, bx, by, bz, cx, cy, cz)
          out.push(ax, ay, az, bx, by, bz, mx, my, mz, ax, ay, az, mx, my, mz, cx, cy, cz)
        } else {
          const [mx, my, mz] = getMid(kCA, cx, cy, cz, ax, ay, az)
          out.push(ax, ay, az, bx, by, bz, mx, my, mz, mx, my, mz, bx, by, bz, cx, cy, cz)
        }
        nextExcl.push(ex, ex)
        continue
      }

      if (!sAB) {
        const [mBCx, mBCy, mBCz] = getMid(kBC, bx, by, bz, cx, cy, cz)
        const [mCAx, mCAy, mCAz] = getMid(kCA, cx, cy, cz, ax, ay, az)
        out.push(
          ax, ay, az, bx, by, bz, mBCx, mBCy, mBCz,
          ax, ay, az, mBCx, mBCy, mBCz, mCAx, mCAy, mCAz,
          cx, cy, cz, mCAx, mCAy, mCAz, mBCx, mBCy, mBCz,
        )
        nextExcl.push(ex, ex, ex)
      } else if (!sBC) {
        const [mABx, mABy, mABz] = getMid(kAB, ax, ay, az, bx, by, bz)
        const [mCAx, mCAy, mCAz] = getMid(kCA, cx, cy, cz, ax, ay, az)
        out.push(
          ax, ay, az, mABx, mABy, mABz, mCAx, mCAy, mCAz,
          mABx, mABy, mABz, bx, by, bz, cx, cy, cz,
          mABx, mABy, mABz, cx, cy, cz, mCAx, mCAy, mCAz,
        )
        nextExcl.push(ex, ex, ex)
      } else {
        const [mABx, mABy, mABz] = getMid(kAB, ax, ay, az, bx, by, bz)
        const [mBCx, mBCy, mBCz] = getMid(kBC, bx, by, bz, cx, cy, cz)
        out.push(
          bx, by, bz, mBCx, mBCy, mBCz, mABx, mABy, mABz,
          ax, ay, az, mABx, mABy, mABz, mBCx, mBCy, mBCz,
          ax, ay, az, mBCx, mBCy, mBCz, cx, cy, cz,
        )
        nextExcl.push(ex, ex, ex)
      }
      if (t % scanStride === 0 || t === triCount - 1) {
        onProgress?.(clamp01(levelLo + span * (0.38 + 0.62 * (t / triDenom))))
      }
    }
    if (out.length > 0) {
      current = new Float32Array(out)
      faceExcl = new Uint8Array(nextExcl.length)
      for (let i = 0; i < nextExcl.length; i += 1) {
        faceExcl[i] = nextExcl[i] ? 1 : 0
      }
    }
    edgeThreshold *= 0.6
    onProgress?.(clamp01(levelHi))
    if (!changed || safetyCapHit) break
  }
  onProgress?.(1)
  const outTri = Math.floor(current.length / 9)
  const triExcludedOut = new Uint8Array(outTri)
  if (faceExcl.length >= outTri) {
    triExcludedOut.set(faceExcl.subarray(0, outTri))
  } else {
    for (let i = 0; i < Math.min(faceExcl.length, outTri); i += 1) {
      triExcludedOut[i] = faceExcl[i] ? 1 : 0
    }
  }
  return { vertices: current, safetyCapHit, triExcludedOut }
}
