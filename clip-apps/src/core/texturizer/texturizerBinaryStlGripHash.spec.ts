// @vitest-environment node
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { exportNonIndexedTrianglesToStlBinaryBlobAsync } from './stlBinaryExport'
import {
  sha256BinaryStlTriangleRecords,
  TEXTURIZER_BINARY_STL_RECORD_SHA256,
  TEXTURIZER_GRIP_PARITY_STL_HEADER,
} from './texturizerBinaryStlGripHash'

/** Unit right triangle in XY (same topology as grip/texturizer golden). */
const TRIANGLE = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])

function toArrayBuffer(data: ArrayBuffer | ArrayBufferView): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}

async function exportThreeJsBinaryStl(vertices: Float32Array, header: string): Promise<ArrayBuffer> {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
  const exporter = new STLExporter()
  const out = toArrayBuffer(exporter.parse(mesh, { binary: true }) as ArrayBuffer | Uint8Array)
  if (header.length > 0) {
    const view = new DataView(out)
    for (let i = 0; i < Math.min(80, header.length); i += 1) {
      view.setUint8(i, header.charCodeAt(i) & 0xff)
    }
  }
  return out
}

describe('texturizerBinaryStlGripHash', () => {
  it('shape_cam binary STL triangle records match Three.js STLExporter', async () => {
    const ours = await exportNonIndexedTrianglesToStlBinaryBlobAsync(TRIANGLE, {
      headerText: TEXTURIZER_GRIP_PARITY_STL_HEADER,
    })
    const grip = await exportThreeJsBinaryStl(TRIANGLE, TEXTURIZER_GRIP_PARITY_STL_HEADER)
    const oursBuf = await ours.arrayBuffer()
    const oursHash = sha256BinaryStlTriangleRecords(oursBuf, 1)
    const gripHash = sha256BinaryStlTriangleRecords(grip, 1)
    expect(oursHash).toBe(gripHash)
  })

  it('pins triangle-record hash for regression', async () => {
    const blob = await exportNonIndexedTrianglesToStlBinaryBlobAsync(TRIANGLE, {
      headerText: TEXTURIZER_GRIP_PARITY_STL_HEADER,
    })
    const hash = sha256BinaryStlTriangleRecords(await blob.arrayBuffer(), 1)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toBe(TEXTURIZER_BINARY_STL_RECORD_SHA256)
  })
})
