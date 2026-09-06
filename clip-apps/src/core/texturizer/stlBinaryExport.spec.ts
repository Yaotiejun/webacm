import { describe, expect, it } from 'vitest'
import { TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH } from './stlBinaryLayout'
import {
  exportNonIndexedTrianglesToStlBinaryBlobAsync,
  readBinaryStlTriangleCount,
} from './stlBinaryExport'

const TRIANGLE = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])

describe('stlBinaryExport', () => {
  it('exports grip-sized binary STL for one triangle', async () => {
    const blob = await exportNonIndexedTrianglesToStlBinaryBlobAsync(TRIANGLE)
    const buf = await blob.arrayBuffer()
    expect(buf.byteLength).toBe(TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH)
    expect(readBinaryStlTriangleCount(buf)).toBe(1)
  })

  it('writes header label in first 80 bytes', async () => {
    const blob = await exportNonIndexedTrianglesToStlBinaryBlobAsync(TRIANGLE, {
      headerText: 'test',
    })
    const buf = await blob.arrayBuffer()
    const header = new TextDecoder().decode(new Uint8Array(buf, 0, 80)).replace(/\0/g, '')
    expect(header.startsWith('test')).toBe(true)
  })
})
