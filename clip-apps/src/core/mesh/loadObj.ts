/**
 * Kiri-Moto-compatible Wavefront OBJ → triangle soup (mm).
 * Ports `grid-apps/src/load/obj.js` parse + widget autoscale (meters → mm when max|v| < 1).
 */

export type ObjVert = [number, number, number]

export type ObjFaceGroup = {
  name?: string
  /** Flat xyz triples forming triangles (after n-gon fan triangulation). */
  faces: number[]
}

/** Fan-triangulate a polygon (convex CAD faces; matches common ATF/Onshape OBJ). */
export function fanTriangulateIndices(indices: number[]): number[][] {
  if (indices.length < 3) return []
  if (indices.length === 3) return [indices.slice()]
  const tris: number[][] = []
  const a = indices[0]!
  for (let i = 1; i < indices.length - 1; i += 1) {
    tris.push([a, indices[i]!, indices[i + 1]!])
  }
  return tris
}

/**
 * Parse OBJ text into named face groups of triangle soups (flat number arrays).
 */
export function parseObj(text: string): ObjFaceGroup[] {
  const lines = text.replaceAll(/ +/g, ' ').split('\n').map((l) => l.trim())
  const verts: ObjVert[] = []
  let faces: number[] = []
  let groupName: string | undefined
  const objs: ObjFaceGroup[] = []

  const pushGroup = () => {
    if (faces.length) {
      objs.push({ name: groupName, faces })
      faces = []
    }
  }

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const toks = line.split(' ')
    const tag = toks.shift()
    switch (tag) {
      case 'v': {
        const v = toks.map((x) => parseFloat(x)).slice(0, 3)
        if (v.length >= 3 && v.every((n) => Number.isFinite(n))) {
          verts.push([v[0]!, v[1]!, v[2]!])
        }
        break
      }
      case 'f': {
        const idx = toks
          .map((f) => parseInt(f.split('/')[0] ?? '', 10))
          .filter((n) => Number.isFinite(n))
        // OBJ allows negative indices (from end)
        const resolved = idx.map((t) => (t < 0 ? verts.length + t + 1 : t))
        for (const tri of fanTriangulateIndices(resolved)) {
          for (const vi of tri) {
            const p = verts[vi - 1]
            if (p) faces.push(p[0], p[1], p[2])
          }
        }
        break
      }
      case 'g':
      case 'o': {
        pushGroup()
        groupName = toks.join(' ') || undefined
        break
      }
      default:
        break
    }
  }
  pushGroup()
  return objs.length ? objs : [{ faces }]
}

/** Concatenate all groups into one Float32Array triangle soup. */
export function flattenObjGroups(groups: ObjFaceGroup[]): Float32Array {
  let total = 0
  for (const g of groups) total += g.faces.length
  const out = new Float32Array(total)
  let o = 0
  for (const g of groups) {
    out.set(g.faces, o)
    o += g.faces.length
  }
  return out
}

/**
 * Onshape/Autodesk often export meters; if all |coords| < 1, scale ×1000 → mm
 * (Kiri `widget.loadVertices(..., { autoscale: true })`).
 */
export function autoscaleMetersToMm(vertices: Float32Array): { scaled: boolean; maxAbs: number } {
  let maxv = 0
  for (let i = 0; i < vertices.length; i += 1) {
    maxv = Math.max(maxv, Math.abs(vertices[i] ?? 0))
  }
  if (maxv > 0 && maxv < 1) {
    for (let i = 0; i < vertices.length; i += 1) {
      vertices[i]! *= 1000
    }
    return { scaled: true, maxAbs: maxv * 1000 }
  }
  return { scaled: false, maxAbs: maxv }
}

export function parseObjToTriangleSoup(
  text: string,
  opts: { autoscale?: boolean } = {},
): { vertices: Float32Array; groups: ObjFaceGroup[]; scaledFromMeters: boolean } {
  const groups = parseObj(text)
  const vertices = flattenObjGroups(groups)
  let scaledFromMeters = false
  if (opts.autoscale !== false) {
    scaledFromMeters = autoscaleMetersToMm(vertices).scaled
  }
  return { vertices, groups, scaledFromMeters }
}
