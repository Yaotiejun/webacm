function safeRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.max(0.05, Math.min(1, ratio)) : 1
}

export type DecimationEngine = 'none' | 'qem-lite' | 'cluster' | 'cluster+downsample'

export interface DecimationSearchMeta {
  expansionLimit: number
  binaryItersPlanned: number
  binaryItersExecuted: number
  stagnationLimit: number
  earlyStopReason: 'target-close' | 'stagnation' | 'stagnation-retry' | 'max-iters' | 'not-applicable'
  finalDiff: number
}

export interface AdaptiveDecimationSearchConfig {
  expansionLimit: number
  binaryIters: number
  stagnationLimit: number
  retryIters: number
  /** Triangle-count floor: `triCount` must meet this before stagnation-retry probes run. */
  stagnationRetryMinTri: number
  /** Relative gap floor: `bestDiff / target` must meet this before stagnation-retry runs. */
  stagnationRetryMinRelMiss: number
}

export function resolveAdaptiveSearchConfig(triCount: number, ratio: number): AdaptiveDecimationSearchConfig {
  const density = Math.max(1, triCount / 2000)
  const ratioHardness = Math.max(1, (1 - ratio) * 4 + 1)
  const complexity = Math.log2(density * ratioHardness + 1)
  const expansionLimit = Math.max(6, Math.min(12, Math.round(6 + complexity)))
  const binaryIters = Math.max(6, Math.min(12, Math.round(6 + complexity * 1.2)))
  const stagnationLimit = Math.max(2, Math.min(4, Math.round(2 + complexity * 0.35)))
  const retryIters = Math.max(2, Math.min(5, Math.round(2 + complexity * 0.4)))
  const scale = triCount / 2000
  const stagnationRetryMinTri = Math.max(1650, Math.min(2150, Math.round(1950 + (1 - scale) * 200)))
  const stagnationRetryMinRelMiss = Math.max(0.052, Math.min(0.09, 0.048 + ratio * 0.038))
  return { expansionLimit, binaryIters, stagnationLimit, retryIters, stagnationRetryMinTri, stagnationRetryMinRelMiss }
}

function clusterWithCell(vertices: Float32Array, cs: number, minX: number, minY: number, minZ: number): Float32Array {
  const triCount = Math.floor(vertices.length / 9)
  const clusters = new Map<string, { sx: number; sy: number; sz: number; n: number; x: number; y: number; z: number }>()
  const vertClusterKey = new Array<string>(Math.floor(vertices.length / 3))
  for (let i = 0, vi = 0; i < vertices.length; i += 3, vi += 1) {
    const x = vertices[i] ?? 0
    const y = vertices[i + 1] ?? 0
    const z = vertices[i + 2] ?? 0
    const ix = Math.floor((x - minX) / cs)
    const iy = Math.floor((y - minY) / cs)
    const iz = Math.floor((z - minZ) / cs)
    const key = `${ix}|${iy}|${iz}`
    vertClusterKey[vi] = key
    const c = clusters.get(key)
    if (c) {
      c.sx += x
      c.sy += y
      c.sz += z
      c.n += 1
    } else {
      clusters.set(key, { sx: x, sy: y, sz: z, n: 1, x: 0, y: 0, z: 0 })
    }
  }
  clusters.forEach((c) => {
    c.x = c.sx / c.n
    c.y = c.sy / c.n
    c.z = c.sz / c.n
  })

  const tris: number[] = []
  const triSeen = new Set<string>()
  for (let t = 0; t < triCount; t += 1) {
    const v0 = t * 3
    const k0 = vertClusterKey[v0]
    const k1 = vertClusterKey[v0 + 1]
    const k2 = vertClusterKey[v0 + 2]
    if (!k0 || !k1 || !k2) continue
    if (k0 === k1 || k1 === k2 || k2 === k0) continue
    const sig = [k0, k1, k2].sort().join('::')
    if (triSeen.has(sig)) continue
    triSeen.add(sig)
    const c0 = clusters.get(k0)
    const c1 = clusters.get(k1)
    const c2 = clusters.get(k2)
    if (!c0 || !c1 || !c2) continue
    tris.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z)
  }
  return tris.length > 0 ? new Float32Array(tris) : vertices
}

function downsampleTrianglesDistributed(vertices: Float32Array, targetTriangles: number): Float32Array {
  const triCount = Math.floor(vertices.length / 9)
  if (targetTriangles >= triCount || targetTriangles <= 0) return vertices
  if (triCount <= 1) return vertices
  const out = new Float32Array(targetTriangles * 9)
  const step = triCount / targetTriangles
  let prev = -1
  let w = 0
  for (let i = 0; i < targetTriangles; i += 1) {
    let idx = Math.floor((i + 0.5) * step)
    if (idx >= triCount) idx = triCount - 1
    if (idx <= prev) idx = Math.min(triCount - 1, prev + 1)
    prev = idx
    const src = idx * 9
    out[w++] = vertices[src] ?? 0
    out[w++] = vertices[src + 1] ?? 0
    out[w++] = vertices[src + 2] ?? 0
    out[w++] = vertices[src + 3] ?? 0
    out[w++] = vertices[src + 4] ?? 0
    out[w++] = vertices[src + 5] ?? 0
    out[w++] = vertices[src + 6] ?? 0
    out[w++] = vertices[src + 7] ?? 0
    out[w++] = vertices[src + 8] ?? 0
  }
  return out
}

function buildIndexedMesh(vertices: Float32Array) {
  const triCount = Math.floor(vertices.length / 9)
  const positions: number[] = []
  const faces = new Int32Array(triCount * 3)
  const map = new Map<string, number>()
  const q = 1e5
  let next = 0
  for (let i = 0, vi = 0; i < vertices.length; i += 3, vi += 1) {
    const x = vertices[i] ?? 0
    const y = vertices[i + 1] ?? 0
    const z = vertices[i + 2] ?? 0
    const key = `${Math.round(x * q)}_${Math.round(y * q)}_${Math.round(z * q)}`
    let idx = map.get(key)
    if (idx == null) {
      idx = next++
      map.set(key, idx)
      positions.push(x, y, z)
    }
    faces[vi] = idx
  }
  return { positions, faces, triCount, vertCount: next }
}

function activeTriCount(faces: Int32Array): number {
  let n = 0
  for (let i = 0; i < faces.length; i += 3) {
    if (faces[i] != null && (faces[i] ?? -1) >= 0) n += 1
  }
  return n
}

function faceNormal(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): [number, number, number] {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  return [nx / len, ny / len, nz / len]
}

function initQuadrics(positions: number[], faces: Int32Array): Float64Array {
  const vertCount = Math.floor(positions.length / 3)
  const q = new Float64Array(vertCount * 10)
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    const ax = positions[a * 3] ?? 0
    const ay = positions[a * 3 + 1] ?? 0
    const az = positions[a * 3 + 2] ?? 0
    const bx = positions[b * 3] ?? 0
    const by = positions[b * 3 + 1] ?? 0
    const bz = positions[b * 3 + 2] ?? 0
    const cx = positions[c * 3] ?? 0
    const cy = positions[c * 3 + 1] ?? 0
    const cz = positions[c * 3 + 2] ?? 0
    const [nx, ny, nz] = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz)
    const d = -(nx * ax + ny * ay + nz * az)
    const add = (v: number) => {
      const o = v * 10
      q[o] = (q[o] ?? 0) + nx * nx
      q[o + 1] = (q[o + 1] ?? 0) + nx * ny
      q[o + 2] = (q[o + 2] ?? 0) + nx * nz
      q[o + 3] = (q[o + 3] ?? 0) + nx * d
      q[o + 4] = (q[o + 4] ?? 0) + ny * ny
      q[o + 5] = (q[o + 5] ?? 0) + ny * nz
      q[o + 6] = (q[o + 6] ?? 0) + ny * d
      q[o + 7] = (q[o + 7] ?? 0) + nz * nz
      q[o + 8] = (q[o + 8] ?? 0) + nz * d
      q[o + 9] = (q[o + 9] ?? 0) + d * d
    }
    add(a)
    add(b)
    add(c)
  }
  return q
}

function addFaceQuadricContribution(
  quadrics: Float64Array,
  a: number,
  b: number,
  c: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
  scale: number,
) {
  const [nx, ny, nz] = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz)
  const d = -(nx * ax + ny * ay + nz * az)
  const add = (v: number) => {
    const o = v * 10
    quadrics[o] = (quadrics[o] ?? 0) + nx * nx * scale
    quadrics[o + 1] = (quadrics[o + 1] ?? 0) + nx * ny * scale
    quadrics[o + 2] = (quadrics[o + 2] ?? 0) + nx * nz * scale
    quadrics[o + 3] = (quadrics[o + 3] ?? 0) + nx * d * scale
    quadrics[o + 4] = (quadrics[o + 4] ?? 0) + ny * ny * scale
    quadrics[o + 5] = (quadrics[o + 5] ?? 0) + ny * nz * scale
    quadrics[o + 6] = (quadrics[o + 6] ?? 0) + ny * d * scale
    quadrics[o + 7] = (quadrics[o + 7] ?? 0) + nz * nz * scale
    quadrics[o + 8] = (quadrics[o + 8] ?? 0) + nz * d * scale
    quadrics[o + 9] = (quadrics[o + 9] ?? 0) + d * d * scale
  }
  add(a)
  add(b)
  add(c)
}

function evalQuadric(q: Float64Array, v: number, x: number, y: number, z: number): number {
  const o = v * 10
  return (
    (q[o] ?? 0) * x * x +
    2 * (q[o + 1] ?? 0) * x * y +
    2 * (q[o + 2] ?? 0) * x * z +
    2 * (q[o + 3] ?? 0) * x +
    (q[o + 4] ?? 0) * y * y +
    2 * (q[o + 5] ?? 0) * y * z +
    2 * (q[o + 6] ?? 0) * y +
    (q[o + 7] ?? 0) * z * z +
    2 * (q[o + 8] ?? 0) * z +
    (q[o + 9] ?? 0)
  )
}

function edgeFaceCounts(faces: Int32Array): Map<string, number> {
  const out = new Map<string, number>()
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    const edges: Array<[number, number]> = [[a, b], [b, c], [c, a]]
    for (let e = 0; e < edges.length; e += 1) {
      const p = edges[e]?.[0] ?? -1
      const q = edges[e]?.[1] ?? -1
      if (p < 0 || q < 0 || p === q) continue
      const lo = p < q ? p : q
      const hi = p < q ? q : p
      const k = `${lo}|${hi}`
      out.set(k, (out.get(k) ?? 0) + 1)
    }
  }
  return out
}

function addFaceEdgeUses(edgeUse: Map<string, number>, a: number, b: number, c: number, delta: number) {
  const edges: Array<[number, number]> = [[a, b], [b, c], [c, a]]
  for (let i = 0; i < 3; i += 1) {
    const p = edges[i]?.[0] ?? -1
    const q = edges[i]?.[1] ?? -1
    if (p < 0 || q < 0 || p === q) continue
    const k = edgeKey(p, q)
    const next = (edgeUse.get(k) ?? 0) + delta
    if (next > 0) edgeUse.set(k, next)
    else edgeUse.delete(k)
  }
}

function buildVertexFaceAdjacency(faces: Int32Array, vertCount: number): Array<Set<number>> {
  const adj = Array.from({ length: vertCount }, () => new Set<number>())
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    adj[a]?.add(i)
    adj[b]?.add(i)
    adj[c]?.add(i)
  }
  return adj
}

type EdgeCandidate = { a: number; b: number; x: number; y: number; z: number; cost: number; key: string; version: number }

class MinEdgeHeap {
  private data: EdgeCandidate[] = []

  push(v: EdgeCandidate) {
    this.data.push(v)
    this.bubbleUp(this.data.length - 1)
  }

  pop(): EdgeCandidate | undefined {
    const n = this.data.length
    if (n <= 0) return undefined
    const top = this.data[0]
    const tail = this.data.pop()
    if (n > 1 && tail) {
      this.data[0] = tail
      this.sinkDown(0)
    }
    return top
  }

  size(): number {
    return this.data.length
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1
      const pv = this.data[p]
      const iv = this.data[i]
      if (!pv || !iv || pv.cost <= iv.cost) break
      this.data[p] = iv
      this.data[i] = pv
      i = p
    }
  }

  private sinkDown(i: number) {
    const n = this.data.length
    while (true) {
      let s = i
      const l = i * 2 + 1
      const r = l + 1
      if (l < n && (this.data[l]?.cost ?? Infinity) < (this.data[s]?.cost ?? Infinity)) s = l
      if (r < n && (this.data[r]?.cost ?? Infinity) < (this.data[s]?.cost ?? Infinity)) s = r
      if (s === i) break
      const tmp = this.data[i]
      this.data[i] = this.data[s] as EdgeCandidate
      this.data[s] = tmp as EdgeCandidate
      i = s
    }
  }
}

function sharedActiveFacesForEdge(
  faces: Int32Array,
  a: number,
  b: number,
  adj?: Array<Set<number>>,
): number {
  if (adj) {
    const sa = adj[a]
    const sb = adj[b]
    if (!sa || !sb) return 0
    let n = 0
    const small = sa.size <= sb.size ? sa : sb
    const big = sa.size <= sb.size ? sb : sa
    for (const fi of small) {
      if (big.has(fi)) n += 1
    }
    return n
  }
  let n = 0
  for (let i = 0; i < faces.length; i += 3) {
    const fa = faces[i] ?? -1
    const fb = faces[i + 1] ?? -1
    const fc = faces[i + 2] ?? -1
    if (fa < 0 || fb < 0 || fc < 0) continue
    if (fa === a || fb === a || fc === a) {
      if (fa === b || fb === b || fc === b) n += 1
    }
  }
  return n
}

function affectedFaces(faces: Int32Array, v1: number, v2: number, adj?: Array<Set<number>>): number[] {
  if (adj) {
    const out = new Set<number>()
    const a = adj[v1]
    const b = adj[v2]
    if (a) {
      for (const fi of a) out.add(fi)
    }
    if (b) {
      for (const fi of b) out.add(fi)
    }
    return [...out]
  }
  const out: number[] = []
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    if (a === v1 || b === v1 || c === v1 || a === v2 || b === v2 || c === v2) out.push(i)
  }
  return out
}

function hasLinkViolation(faces: Int32Array, v1: number, v2: number, adj?: Array<Set<number>>): boolean {
  if (adj) {
    const n1 = new Set<number>()
    const n2 = new Set<number>()
    const f1 = adj[v1]
    const f2 = adj[v2]
    if (f1) {
      for (const fi of f1) {
        const a = faces[fi] ?? -1
        const b = faces[fi + 1] ?? -1
        const c = faces[fi + 2] ?? -1
        if (a < 0 || b < 0 || c < 0) continue
        if (a !== v1) n1.add(a)
        if (b !== v1) n1.add(b)
        if (c !== v1) n1.add(c)
      }
    }
    if (f2) {
      for (const fi of f2) {
        const a = faces[fi] ?? -1
        const b = faces[fi + 1] ?? -1
        const c = faces[fi + 2] ?? -1
        if (a < 0 || b < 0 || c < 0) continue
        if (a !== v2) n2.add(a)
        if (b !== v2) n2.add(b)
        if (c !== v2) n2.add(c)
      }
    }
    n1.delete(v2)
    n2.delete(v1)
    let common = 0
    n1.forEach((v) => {
      if (n2.has(v)) common += 1
    })
    return common > 2
  }
  const n1 = new Set<number>()
  const n2 = new Set<number>()
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    const tri = [a, b, c]
    const hasV1 = a === v1 || b === v1 || c === v1
    const hasV2 = a === v2 || b === v2 || c === v2
    if (hasV1) {
      for (let k = 0; k < 3; k += 1) {
        const v = tri[k] ?? -1
        if (v >= 0 && v !== v1) n1.add(v)
      }
    }
    if (hasV2) {
      for (let k = 0; k < 3; k += 1) {
        const v = tri[k] ?? -1
        if (v >= 0 && v !== v2) n2.add(v)
      }
    }
  }
  n1.delete(v2)
  n2.delete(v1)
  let common = 0
  n1.forEach((v) => {
    if (n2.has(v)) common += 1
  })
  // Manifold interior edge should have exactly 2 common neighbors.
  // Larger values indicate pinching/non-manifold risk on collapse.
  return common > 2
}

function hasNormalFlip(
  positions: number[],
  faces: Int32Array,
  vKeep: number,
  vRemove: number,
  nx: number,
  ny: number,
  nz: number,
  adj?: Array<Set<number>>,
): boolean {
  const FLIP_DOT = 0.2
  const affected = affectedFaces(faces, vKeep, vRemove, adj)
  for (let i = 0; i < affected.length; i += 1) {
    const fi = affected[i] ?? -1
    if (fi < 0) continue
    const a = faces[fi] ?? -1
    const b = faces[fi + 1] ?? -1
    const c = faces[fi + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    const ax = positions[a * 3] ?? 0
    const ay = positions[a * 3 + 1] ?? 0
    const az = positions[a * 3 + 2] ?? 0
    const bx = positions[b * 3] ?? 0
    const by = positions[b * 3 + 1] ?? 0
    const bz = positions[b * 3 + 2] ?? 0
    const cx = positions[c * 3] ?? 0
    const cy = positions[c * 3 + 1] ?? 0
    const cz = positions[c * 3 + 2] ?? 0
    const on = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz)

    const nax = a === vKeep || a === vRemove ? nx : ax
    const nay = a === vKeep || a === vRemove ? ny : ay
    const naz = a === vKeep || a === vRemove ? nz : az
    const nbx = b === vKeep || b === vRemove ? nx : bx
    const nby = b === vKeep || b === vRemove ? ny : by
    const nbz = b === vKeep || b === vRemove ? nz : bz
    const ncx = c === vKeep || c === vRemove ? nx : cx
    const ncy = c === vKeep || c === vRemove ? ny : cy
    const ncz = c === vKeep || c === vRemove ? nz : cz
    const nn = faceNormal(nax, nay, naz, nbx, nby, nbz, ncx, ncy, ncz)
    const dot = (on[0] ?? 0) * (nn[0] ?? 0) + (on[1] ?? 0) * (nn[1] ?? 0) + (on[2] ?? 0) * (nn[2] ?? 0)
    if (dot < FLIP_DOT) return true
  }
  return false
}

function collapseEdgeWithAdjacency(
  faces: Int32Array,
  adj: Array<Set<number>>,
  edgeUse: Map<string, number>,
  keep: number,
  remove: number,
): Set<number> {
  const keepFaces = adj[keep] ? [...adj[keep]] : []
  const removeFaces = adj[remove] ? [...adj[remove]] : []
  const dirtyFaces = new Set<number>([...keepFaces, ...removeFaces])
  const oldFaceVerts = new Map<number, [number, number, number]>()

  for (const fi of dirtyFaces) {
    oldFaceVerts.set(fi, [faces[fi] ?? -1, faces[fi + 1] ?? -1, faces[fi + 2] ?? -1])
  }

  for (const fi of removeFaces) {
    if (faces[fi] === remove) faces[fi] = keep
    if (faces[fi + 1] === remove) faces[fi + 1] = keep
    if (faces[fi + 2] === remove) faces[fi + 2] = keep
  }

  for (const fi of dirtyFaces) {
    const a = faces[fi] ?? -1
    const b = faces[fi + 1] ?? -1
    const c = faces[fi + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    if (a === b || b === c || c === a) {
      faces[fi] = -1
      faces[fi + 1] = -1
      faces[fi + 2] = -1
    }
  }

  for (const fi of dirtyFaces) {
    const oldVerts = oldFaceVerts.get(fi)
    if (oldVerts) {
      const oa = oldVerts[0] ?? -1
      const ob = oldVerts[1] ?? -1
      const oc = oldVerts[2] ?? -1
      if (oa >= 0 && ob >= 0 && oc >= 0) addFaceEdgeUses(edgeUse, oa, ob, oc, -1)
      for (let i = 0; i < 3; i += 1) {
        const v = oldVerts[i] ?? -1
        if (v >= 0) adj[v]?.delete(fi)
      }
    }
    const a = faces[fi] ?? -1
    const b = faces[fi + 1] ?? -1
    const c = faces[fi + 2] ?? -1
    if (a >= 0 && b >= 0 && c >= 0) {
      addFaceEdgeUses(edgeUse, a, b, c, 1)
      adj[a]?.add(fi)
      adj[b]?.add(fi)
      adj[c]?.add(fi)
    }
  }
  if (adj[remove]) adj[remove].clear()
  return dirtyFaces
}

function edgeKey(a: number, b: number): string {
  const lo = a < b ? a : b
  const hi = a < b ? b : a
  return `${lo}|${hi}`
}

function scoreEdgeCandidate(positions: number[], quadrics: Float64Array, lo: number, hi: number): Omit<EdgeCandidate, 'key' | 'version'> {
  const ax = positions[lo * 3] ?? 0
  const ay = positions[lo * 3 + 1] ?? 0
  const az = positions[lo * 3 + 2] ?? 0
  const bx = positions[hi * 3] ?? 0
  const by = positions[hi * 3 + 1] ?? 0
  const bz = positions[hi * 3 + 2] ?? 0
  const mx = (ax + bx) * 0.5
  const my = (ay + by) * 0.5
  const mz = (az + bz) * 0.5
  const p0 = evalQuadric(quadrics, lo, ax, ay, az) + evalQuadric(quadrics, hi, ax, ay, az)
  const p1 = evalQuadric(quadrics, lo, bx, by, bz) + evalQuadric(quadrics, hi, bx, by, bz)
  const pm = evalQuadric(quadrics, lo, mx, my, mz) + evalQuadric(quadrics, hi, mx, my, mz)
  if (pm <= p0 && pm <= p1) return { a: lo, b: hi, x: mx, y: my, z: mz, cost: pm }
  if (p0 <= p1) return { a: lo, b: hi, x: ax, y: ay, z: az, cost: p0 }
  return { a: lo, b: hi, x: bx, y: by, z: bz, cost: p1 }
}

function collectEdgeCandidates(
  positions: number[],
  faces: Int32Array,
  quadrics: Float64Array,
  edgeUse: Map<string, number>,
  versions: Map<string, number>,
  faceStarts?: Iterable<number>,
): MinEdgeHeap {
  const out = new MinEdgeHeap()
  const seen = new Set<string>()
  const scan = faceStarts ?? (function* allFaces() {
    for (let i = 0; i < faces.length; i += 3) yield i
  })()
  for (const i of scan) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    const edges: Array<[number, number]> = [[a, b], [b, c], [c, a]]
    for (let e = 0; e < 3; e += 1) {
      const p = edges[e]?.[0] ?? -1
      const q = edges[e]?.[1] ?? -1
      if (p < 0 || q < 0 || p === q) continue
      const lo = p < q ? p : q
      const hi = p < q ? q : p
      const k = `${lo}|${hi}`
      if (seen.has(k)) continue
      seen.add(k)
      if ((edgeUse.get(k) ?? 0) < 2) continue
      const v = (versions.get(k) ?? 0) + 1
      versions.set(k, v)
      const cand = scoreEdgeCandidate(positions, quadrics, lo, hi)
      out.push({ ...cand, key: k, version: v })
    }
  }
  return out
}

function buildNonIndexed(positions: number[], faces: Int32Array): Float32Array {
  const out: number[] = []
  for (let i = 0; i < faces.length; i += 3) {
    const a = faces[i] ?? -1
    const b = faces[i + 1] ?? -1
    const c = faces[i + 2] ?? -1
    if (a < 0 || b < 0 || c < 0) continue
    out.push(
      positions[a * 3] ?? 0,
      positions[a * 3 + 1] ?? 0,
      positions[a * 3 + 2] ?? 0,
      positions[b * 3] ?? 0,
      positions[b * 3 + 1] ?? 0,
      positions[b * 3 + 2] ?? 0,
      positions[c * 3] ?? 0,
      positions[c * 3 + 1] ?? 0,
      positions[c * 3 + 2] ?? 0,
    )
  }
  return out.length ? new Float32Array(out) : new Float32Array(0)
}

function decimateTrianglesQemLite(vertices: Float32Array, target: number, onProgress?: (p: number) => void): Float32Array {
  const { positions, faces, triCount, vertCount } = buildIndexedMesh(vertices)
  if (target >= triCount) return vertices
  let active = activeTriCount(faces)
  let guard = 0
  const initActive = Math.max(1, active)
  const vertexFaceAdj = buildVertexFaceAdjacency(faces, vertCount)
  const edgeUse = edgeFaceCounts(faces)
  let quadrics = initQuadrics(positions, faces)
  const versions = new Map<string, number>()
  let edges = collectEdgeCandidates(positions, faces, quadrics, edgeUse, versions)
  while (active > target && guard < triCount * 2) {
    if (edges.size() <= 0) break
    let collapsedSinceRefresh = 0
    while (edges.size() > 0) {
      const e = edges.pop()
      if (!e) continue
      if ((versions.get(e.key) ?? 0) !== e.version) continue
      if (sharedActiveFacesForEdge(faces, e.a, e.b, vertexFaceAdj) < 2) continue
      if (hasLinkViolation(faces, e.a, e.b, vertexFaceAdj)) continue
      if (hasNormalFlip(positions, faces, e.a, e.b, e.x, e.y, e.z, vertexFaceAdj)) continue
      const keepAdj = vertexFaceAdj[e.a]
      const removeAdj = vertexFaceAdj[e.b]
      const dirtyFaceList = new Set<number>([
        ...(keepAdj ? [...keepAdj] : []),
        ...(removeAdj ? [...removeAdj] : []),
      ])
      const oldFaceVerts = new Map<number, [number, number, number]>()
      const dirtyVerts = new Set<number>()
      for (const fi of dirtyFaceList) {
        const oa = faces[fi] ?? -1
        const ob = faces[fi + 1] ?? -1
        const oc = faces[fi + 2] ?? -1
        oldFaceVerts.set(fi, [oa, ob, oc])
        if (oa >= 0) dirtyVerts.add(oa)
        if (ob >= 0) dirtyVerts.add(ob)
        if (oc >= 0) dirtyVerts.add(oc)
      }
      const posSnapshot = new Map<number, [number, number, number]>()
      for (const v of dirtyVerts) {
        posSnapshot.set(v, [
          positions[v * 3] ?? 0,
          positions[v * 3 + 1] ?? 0,
          positions[v * 3 + 2] ?? 0,
        ])
      }
      for (const fi of dirtyFaceList) {
        const old = oldFaceVerts.get(fi)
        if (!old) continue
        const oa = old[0] ?? -1
        const ob = old[1] ?? -1
        const oc = old[2] ?? -1
        if (oa < 0 || ob < 0 || oc < 0) continue
        const pa = posSnapshot.get(oa)
        const pb = posSnapshot.get(ob)
        const pc = posSnapshot.get(oc)
        if (!pa || !pb || !pc) continue
        addFaceQuadricContribution(
          quadrics,
          oa,
          ob,
          oc,
          pa[0],
          pa[1],
          pa[2],
          pb[0],
          pb[1],
          pb[2],
          pc[0],
          pc[1],
          pc[2],
          -1,
        )
      }
      positions[e.a * 3] = e.x
      positions[e.a * 3 + 1] = e.y
      positions[e.a * 3 + 2] = e.z
      const dirtyFaces = collapseEdgeWithAdjacency(faces, vertexFaceAdj, edgeUse, e.a, e.b)
      for (const fi of dirtyFaces) {
        const a = faces[fi] ?? -1
        const b = faces[fi + 1] ?? -1
        const c = faces[fi + 2] ?? -1
        if (a < 0 || b < 0 || c < 0) continue
        const ax = positions[a * 3] ?? 0
        const ay = positions[a * 3 + 1] ?? 0
        const az = positions[a * 3 + 2] ?? 0
        const bx = positions[b * 3] ?? 0
        const by = positions[b * 3 + 1] ?? 0
        const bz = positions[b * 3 + 2] ?? 0
        const cx = positions[c * 3] ?? 0
        const cy = positions[c * 3 + 1] ?? 0
        const cz = positions[c * 3 + 2] ?? 0
        addFaceQuadricContribution(
          quadrics,
          a,
          b,
          c,
          ax,
          ay,
          az,
          bx,
          by,
          bz,
          cx,
          cy,
          cz,
          1,
        )
      }
      collapsedSinceRefresh += 1
      guard += 1
      const dirtyEdges = collectEdgeCandidates(positions, faces, quadrics, edgeUse, versions, dirtyFaces)
      while (dirtyEdges.size() > 0) {
        const de = dirtyEdges.pop()
        if (de) edges.push(de)
      }
      if (guard >= triCount * 2) break
    }
    if (collapsedSinceRefresh <= 0) break
    active = activeTriCount(faces)
    const done = Math.max(0, initActive - active)
    const total = Math.max(1, initActive - target)
    onProgress?.(Math.max(0, Math.min(1, done / total)))
  }
  const out = buildNonIndexed(positions, faces)
  onProgress?.(1)
  return out.length > 0 ? out : vertices
}

export function decimateTrianglesClusteredDetailed(
  vertices: Float32Array,
  ratio: number,
  onProgress?: (p: number) => void,
): { vertices: Float32Array; engine: DecimationEngine; searchMeta?: DecimationSearchMeta } {
  const r = safeRatio(ratio)
  if (r >= 0.999) {
    return {
      vertices,
      engine: 'none',
      searchMeta: {
        expansionLimit: 0,
        binaryItersPlanned: 0,
        binaryItersExecuted: 0,
        stagnationLimit: 0,
        earlyStopReason: 'not-applicable',
        finalDiff: 0,
      },
    }
  }
  const triCount = Math.floor(vertices.length / 9)
  const target = Math.max(1, Math.min(triCount, Math.floor(triCount * r)))
  if (target >= triCount) {
    return {
      vertices,
      engine: 'none',
      searchMeta: {
        expansionLimit: 0,
        binaryItersPlanned: 0,
        binaryItersExecuted: 0,
        stagnationLimit: 0,
        earlyStopReason: 'not-applicable',
        finalDiff: 0,
      },
    }
  }
  if (triCount <= 1200) {
    const qemLite = decimateTrianglesQemLite(vertices, target, onProgress)
    const triOut = Math.floor(qemLite.length / 9)
    if (triOut > 0 && triOut < triCount) {
      return {
        vertices: qemLite,
        engine: 'qem-lite',
        searchMeta: {
          expansionLimit: 0,
          binaryItersPlanned: 0,
          binaryItersExecuted: 0,
          stagnationLimit: 0,
          earlyStopReason: 'not-applicable',
          finalDiff: Math.abs(triOut - target),
        },
      }
    }
  }
  onProgress?.(0.02)

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
  const sizeX = Math.max(1e-9, maxX - minX)
  const sizeY = Math.max(1e-9, maxY - minY)
  const sizeZ = Math.max(1e-9, maxZ - minZ)
  const maxDim = Math.max(sizeX, sizeY, sizeZ)
  const normScale = Math.cbrt(Math.max(1, triCount / target))
  const adaptive = resolveAdaptiveSearchConfig(triCount, r)
  const minCell = Math.max(maxDim / 4096, 1e-9)
  const baseCell = Math.max((maxDim / 64) * normScale, maxDim / 2048)

  let best = clusterWithCell(vertices, baseCell, minX, minY, minZ)
  let bestTri = Math.floor(best.length / 9)
  let bestDiff = Math.abs(bestTri - target)
  if (bestDiff <= 2) {
    return {
      vertices: best,
      engine: 'cluster',
      searchMeta: {
        expansionLimit: adaptive.expansionLimit,
        binaryItersPlanned: adaptive.binaryIters,
        binaryItersExecuted: 0,
        stagnationLimit: adaptive.stagnationLimit,
        earlyStopReason: 'target-close',
        finalDiff: bestDiff,
      },
    }
  }

  let lowCell = minCell
  let highCell = Math.max(baseCell * 6, minCell * 2)
  let lowTri = Math.floor(clusterWithCell(vertices, lowCell, minX, minY, minZ).length / 9)
  let highTri = Math.floor(clusterWithCell(vertices, highCell, minX, minY, minZ).length / 9)

  let guard = 0
  while (highTri > target && guard < adaptive.expansionLimit) {
    highCell *= 1.8
    highTri = Math.floor(clusterWithCell(vertices, highCell, minX, minY, minZ).length / 9)
    guard += 1
  }
  guard = 0
  while (lowTri < target && guard < adaptive.expansionLimit) {
    lowCell = Math.max(minCell, lowCell * 0.6)
    lowTri = Math.floor(clusterWithCell(vertices, lowCell, minX, minY, minZ).length / 9)
    guard += 1
    if (lowCell <= minCell) break
  }

  let stagnantRounds = 0
  let binaryItersExecuted = 0
  let earlyStopReason: DecimationSearchMeta['earlyStopReason'] = 'max-iters'
  for (let i = 0; i < adaptive.binaryIters; i += 1) {
    binaryItersExecuted += 1
    const midCell = (lowCell + highCell) * 0.5
    const candidate = clusterWithCell(vertices, midCell, minX, minY, minZ)
    const tri = Math.floor(candidate.length / 9)
    const diff = Math.abs(tri - target)
    if (diff < bestDiff) {
      best = candidate
      bestTri = tri
      bestDiff = diff
      stagnantRounds = 0
    } else {
      stagnantRounds += 1
    }
    if (tri > target) lowCell = midCell
    else highCell = midCell
    onProgress?.(0.15 + ((i + 1) / adaptive.binaryIters) * 0.75)
    if (bestDiff <= 1) {
      earlyStopReason = 'target-close'
      break
    }
    if (stagnantRounds >= adaptive.stagnationLimit) {
      earlyStopReason = 'stagnation'
      break
    }
  }

  const relativeMiss = bestDiff / Math.max(1, target)
  const shouldStagnationRetry =
    earlyStopReason === 'stagnation' &&
    triCount >= adaptive.stagnationRetryMinTri &&
    relativeMiss >= adaptive.stagnationRetryMinRelMiss &&
    bestDiff > Math.max(2, Math.ceil(target * 0.03))

  if (shouldStagnationRetry) {
    for (let i = 0; i < adaptive.retryIters; i += 1) {
      binaryItersExecuted += 1
      const t = (i + 1) / (adaptive.retryIters + 1)
      const probeCell = lowCell * (1 - t) + highCell * t
      const candidate = clusterWithCell(vertices, probeCell, minX, minY, minZ)
      const tri = Math.floor(candidate.length / 9)
      const diff = Math.abs(tri - target)
      if (diff < bestDiff) {
        best = candidate
        bestTri = tri
        bestDiff = diff
        earlyStopReason = 'stagnation-retry'
      }
      onProgress?.(0.9 + ((i + 1) / adaptive.retryIters) * 0.08)
      if (bestDiff <= 1) break
    }
  }

  if (bestTri > target * 1.35) {
    const stronger = clusterWithCell(vertices, highCell * 1.25, minX, minY, minZ)
    const strongerTri = Math.floor(stronger.length / 9)
    if (Math.abs(strongerTri - target) < bestDiff) best = stronger
  }
  const finalTri = Math.floor(best.length / 9)
  const searchMeta: DecimationSearchMeta = {
    expansionLimit: adaptive.expansionLimit,
    binaryItersPlanned: adaptive.binaryIters,
    binaryItersExecuted,
    stagnationLimit: adaptive.stagnationLimit,
    earlyStopReason,
    finalDiff: Math.abs(finalTri - target),
  }
  if (finalTri > target * 1.12) {
    onProgress?.(0.98)
    return { vertices: downsampleTrianglesDistributed(best, target), engine: 'cluster+downsample', searchMeta }
  }
  onProgress?.(1)
  return { vertices: best, engine: 'cluster', searchMeta }
}

export function decimateTrianglesClustered(
  vertices: Float32Array,
  ratio: number,
  onProgress?: (p: number) => void,
): Float32Array {
  return decimateTrianglesClusteredDetailed(vertices, ratio, onProgress).vertices
}
