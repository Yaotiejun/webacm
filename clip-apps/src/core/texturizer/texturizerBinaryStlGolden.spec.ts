import { describe, expect, it } from 'vitest'
import { runTexturizerJob } from './texturizerJob'
import { TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH } from './stlBinaryLayout'
import { exportNonIndexedTrianglesToStlBinaryBlobAsync, readBinaryStlTriangleCount } from './stlBinaryExport'

const TRIANGLE = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])

describe('texturizerBinaryStlGolden', () => {
  it('displaced triangle exports grip-sized binary STL', async () => {
    const result = runTexturizerJob({
      req: {
        vertices: TRIANGLE,
        amplitude: 1,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: 0,
        decimationRatio: 1,
        texture: { width: 1, height: 2, gray: new Uint8Array([0, 255]) },
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: 0, v: 0.75 - p.y * 0.5 }),
    })
    expect(result.kind).toBe('result')
    const blob = await exportNonIndexedTrianglesToStlBinaryBlobAsync(result.vertices)
    const buf = await blob.arrayBuffer()
    expect(buf.byteLength).toBe(TEXTURIZER_BINARY_STL_ONE_TRI_BYTE_LENGTH)
    expect(readBinaryStlTriangleCount(buf)).toBe(1)

    const view = new DataView(buf)
    const nx = view.getFloat32(80 + 4, true)
    const nz = view.getFloat32(80 + 4 + 8, true)
    expect(Math.hypot(nx, view.getFloat32(80 + 4 + 4, true), nz)).toBeCloseTo(1, 5)
    expect(nz).toBeGreaterThan(0.85)
  })
})
