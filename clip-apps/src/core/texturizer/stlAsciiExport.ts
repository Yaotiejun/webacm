const DEFAULT_SOLID = 'shape_cam_texturizer'

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
  let nx = uy * vz - uz * vy
  let ny = uz * vx - ux * vz
  let nz = ux * vy - uy * vx
  const len = Math.hypot(nx, ny, nz)
  if (len < 1e-30) {
    nx = 0
    ny = 0
    nz = 1
  } else {
    nx /= len
    ny /= len
    nz /= len
  }
  return [nx, ny, nz]
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0.000000'
  return n.toFixed(6)
}

function facetBlock(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): string {
  const [nx, ny, nz] = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz)
  return (
    `facet normal ${fmt(nx)} ${fmt(ny)} ${fmt(nz)}\n` +
    'outer loop\n' +
    `vertex ${fmt(ax)} ${fmt(ay)} ${fmt(az)}\n` +
    `vertex ${fmt(bx)} ${fmt(by)} ${fmt(bz)}\n` +
    `vertex ${fmt(cx)} ${fmt(cy)} ${fmt(cz)}\n` +
    'endloop\n' +
    'endfacet\n'
  )
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export interface StlAsciiBlobExportOptions {
  solidName?: string
  /** Facets serialized per chunk before yielding to the browser (default 4096). */
  chunkFacets?: number
  onProgress?: (progress01: number, phase: 'serialize') => void
  signal?: AbortSignal
}

/**
 * Builds an ASCII STL (non-indexed triangle soup) as a Blob in chunks so large meshes
 * stay responsive and avoid one giant string allocation.
 */
export async function exportNonIndexedTrianglesToStlAsciiBlobAsync(
  vertices: Float32Array,
  options?: StlAsciiBlobExportOptions,
): Promise<Blob> {
  const triCount = Math.floor(vertices.length / 9)
  const name = options?.solidName ?? DEFAULT_SOLID
  const chunkFacets = Math.max(64, Math.min(16_384, options?.chunkFacets ?? 4096))
  const parts: BlobPart[] = []
  parts.push(`solid ${name}\n`)

  if (triCount <= 0) {
    parts.push(`endsolid ${name}\n`)
    options?.onProgress?.(1, 'serialize')
    return new Blob(parts, { type: 'application/sla' })
  }

  for (let t0 = 0; t0 < triCount; t0 += chunkFacets) {
    if (options?.signal?.aborted) {
      throw new DOMException('export aborted', 'AbortError')
    }
    const t1 = Math.min(t0 + chunkFacets, triCount)
    let chunk = ''
    for (let i = t0; i < t1; i += 1) {
      const b = i * 9
      chunk += facetBlock(
        vertices[b] ?? 0,
        vertices[b + 1] ?? 0,
        vertices[b + 2] ?? 0,
        vertices[b + 3] ?? 0,
        vertices[b + 4] ?? 0,
        vertices[b + 5] ?? 0,
        vertices[b + 6] ?? 0,
        vertices[b + 7] ?? 0,
        vertices[b + 8] ?? 0,
      )
    }
    parts.push(chunk)
    const p = t1 / triCount
    options?.onProgress?.(p, 'serialize')
    await yieldToMain()
  }

  parts.push(`endsolid ${name}\n`)
  options?.onProgress?.(1, 'serialize')
  return new Blob(parts, { type: 'application/sla' })
}
