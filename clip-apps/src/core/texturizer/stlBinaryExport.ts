import {
  BINARY_STL_HEADER_BYTES,
  BINARY_STL_TRIANGLE_RECORD_BYTES,
  binaryStlByteLength,
} from './stlBinaryLayout'

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

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })
}

export interface StlBinaryExportOptions {
  headerText?: string
  chunkFacets?: number
  onProgress?: (progress01: number, phase: 'serialize') => void
  signal?: AbortSignal
}

/** Writes one binary STL triangle record at `offset` (grip Three.js STLExporter binary layout). */
export function writeBinaryStlTriangle(
  view: DataView,
  offset: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  cx: number,
  cy: number,
  cz: number,
): void {
  const [nx, ny, nz] = faceNormal(ax, ay, az, bx, by, bz, cx, cy, cz)
  let o = offset
  view.setFloat32(o, nx, true)
  o += 4
  view.setFloat32(o, ny, true)
  o += 4
  view.setFloat32(o, nz, true)
  o += 4
  view.setFloat32(o, ax, true)
  o += 4
  view.setFloat32(o, ay, true)
  o += 4
  view.setFloat32(o, az, true)
  o += 4
  view.setFloat32(o, bx, true)
  o += 4
  view.setFloat32(o, by, true)
  o += 4
  view.setFloat32(o, bz, true)
  o += 4
  view.setFloat32(o, cx, true)
  o += 4
  view.setFloat32(o, cy, true)
  o += 4
  view.setFloat32(o, cz, true)
  o += 4
  view.setUint16(o, 0, true)
}

/**
 * Builds binary STL (grip `exporter.js` / Three.js STLExporter) from non-indexed triangle soup.
 */
export async function exportNonIndexedTrianglesToStlBinaryBlobAsync(
  vertices: Float32Array,
  options?: StlBinaryExportOptions,
): Promise<Blob> {
  const triCount = Math.floor(vertices.length / 9)
  const byteLen = binaryStlByteLength(triCount)
  const buf = new ArrayBuffer(byteLen)
  const view = new DataView(buf)

  const header = options?.headerText ?? 'shape_cam_texturizer'
  for (let i = 0; i < BINARY_STL_HEADER_BYTES; i += 1) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) & 0xff : 0)
  }
  view.setUint32(BINARY_STL_HEADER_BYTES, triCount, true)

  if (triCount === 0) {
    options?.onProgress?.(1, 'serialize')
    return new Blob([buf], { type: 'application/octet-stream' })
  }

  const chunkFacets = Math.max(64, Math.min(16_384, options?.chunkFacets ?? 4096))
  let recordOffset = BINARY_STL_HEADER_BYTES + 4

  for (let t0 = 0; t0 < triCount; t0 += chunkFacets) {
    if (options?.signal?.aborted) {
      throw new DOMException('export aborted', 'AbortError')
    }
    const t1 = Math.min(t0 + chunkFacets, triCount)
    for (let i = t0; i < t1; i += 1) {
      const b = i * 9
      writeBinaryStlTriangle(
        view,
        recordOffset,
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
      recordOffset += BINARY_STL_TRIANGLE_RECORD_BYTES
    }
    options?.onProgress?.(t1 / triCount, 'serialize')
    await yieldToMain()
  }

  options?.onProgress?.(1, 'serialize')
  return new Blob([buf], { type: 'application/octet-stream' })
}

export function readBinaryStlTriangleCount(buffer: ArrayBuffer): number {
  if (buffer.byteLength < BINARY_STL_HEADER_BYTES + 4) return 0
  return new DataView(buffer).getUint32(BINARY_STL_HEADER_BYTES, true)
}
