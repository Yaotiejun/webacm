import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  computeAabbInSpace,
  exportMeshesVerticesInSpace,
  seatObjectOnBedZ,
  swizzleZUpPositionsToYUp,
} from './fdmMeshOrient'

function spanOf(out: Float32Array, axis: 0 | 1 | 2) {
  let min = Infinity
  let max = -Infinity
  for (let i = axis; i < out.length; i += 3) {
    const v = out[i]!
    if (v < min) min = v
    if (v > max) max = v
  }
  return { min, max, span: max - min }
}

describe('fdmMeshOrient (Kiri Z-up platform)', () => {
  it('keeps legacy swizzle helper for tests', () => {
    const arr = new Float32Array([1, 2, 3])
    swizzleZUpPositionsToYUp(arr)
    expect(Array.from(arr)).toEqual([1, 3, 2])
  })

  it('seats Z-up mesh on Z=0 and centers XY like Kiri widget.center', () => {
    const geom = new THREE.BoxGeometry(10, 8, 20)
    geom.translate(40, 30, 50) // off-origin Z-up box, height 20 along Z
    const mesh = new THREE.Mesh(geom)
    seatObjectOnBedZ(mesh)
    mesh.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(mesh)
    expect(box.min.z).toBeCloseTo(0)
    expect(box.max.z).toBeCloseTo(20)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0)
    expect((box.min.y + box.max.y) / 2).toBeCloseTo(0)
  })

  it('exports platform-local Z-up verts despite display rotation.x = -PI/2', () => {
    const displayRoot = new THREE.Group()
    displayRoot.rotation.x = -Math.PI / 2

    // File Z-up triangle soup: bed 10×8, height 20
    const geom = new THREE.BufferGeometry()
    geom.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 10, 0, 0, 10, 8, 0, 0, 0, 20, 10, 0, 20, 10, 8, 20]),
        3,
      ),
    )
    const mesh = new THREE.Mesh(geom)
    seatObjectOnBedZ(mesh)
    displayRoot.add(mesh)
    displayRoot.updateMatrixWorld(true)

    const out = exportMeshesVerticesInSpace([mesh], displayRoot)
    const sx = spanOf(out, 0)
    const sy = spanOf(out, 1)
    const sz = spanOf(out, 2)
    expect(sx.span).toBeCloseTo(10)
    expect(sy.span).toBeCloseTo(8)
    expect(sz.span).toBeCloseTo(20)
    expect(sz.min).toBeCloseTo(0)

    const aabb = computeAabbInSpace(mesh, displayRoot)
    expect(aabb.max.z - aabb.min.z).toBeCloseTo(20)
    expect(aabb.max.x - aabb.min.x).toBeCloseTo(10)
    expect(aabb.max.y - aabb.min.y).toBeCloseTo(8)
  })
})
