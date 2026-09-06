/** Binary STL on-disk layout (grip `stlTexturizer` export parity baseline). */
export const BINARY_STL_HEADER_BYTES = 80
export const BINARY_STL_TRIANGLE_RECORD_BYTES = 50

export function binaryStlByteLength(triangleCount: number): number {
  if (!Number.isFinite(triangleCount) || triangleCount < 0) return 0
  return BINARY_STL_HEADER_BYTES + 4 + triangleCount * BINARY_STL_TRIANGLE_RECORD_BYTES
}

/** Pinned for the 1-triangle regression mesh (3 vertices, 1 face). */
export const TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH = binaryStlByteLength(1)
