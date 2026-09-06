import { createHash } from 'node:crypto'
import { BINARY_STL_HEADER_BYTES, BINARY_STL_TRIANGLE_RECORD_BYTES } from './stlBinaryLayout'

/** Shared 80-byte header for shape_cam vs Three.js STLExporter parity. */
export const TEXTURIZER_GRIP_PARITY_STL_HEADER = 'shape_cam_grip_parity'

/**
 * Pinned SHA-256 of 50-byte triangle record (header+count excluded).
 * Update only when intentionally changing stlBinaryExport layout.
 */
export const TEXTURIZER_BINARY_STL_RECORD_SHA256 =
  '0396d9c99fc925233224c9397a3e171aa2c685fc7fd2fe270e085a61b02572a9'

export function sha256Hex(buffer: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(buffer)).digest('hex')
}

/** Hash triangle records only (skip variable header label + uint32 count). */
export function sha256BinaryStlTriangleRecords(buffer: ArrayBuffer, triangleCount: number): string {
  const start = BINARY_STL_HEADER_BYTES + 4
  const end = start + triangleCount * BINARY_STL_TRIANGLE_RECORD_BYTES
  return createHash('sha256').update(Buffer.from(buffer, start, end - start)).digest('hex')
}
