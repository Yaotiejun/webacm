import { describe, expect, it } from 'vitest'
import { Box3 } from 'three'
import { buildTexturizerArrangeMesh, seatTexturizerVertices } from './texturizerArrangeMesh'

function offsetCube(): Float32Array {
  return new Float32Array([
    1, 1, 0, 11, 1, 0, 11, 11, 0,
    1, 1, 0, 11, 11, 0, 1, 11, 0,
    1, 1, 1, 11, 1, 1, 11, 11, 1,
    1, 1, 1, 11, 11, 1, 1, 11, 1,
  ])
}

describe('texturizerArrangeMesh', () => {
  it('builds seated mesh with min Y at bed', () => {
    const mesh = buildTexturizerArrangeMesh(offsetCube())
    const box = new Box3().setFromObject(mesh)
    expect(box.isEmpty()).toBe(false)
    expect(box.min.y).toBeCloseTo(0, 5)
    expect((box.min.x + box.max.x) * 0.5).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) * 0.5).toBeCloseTo(0, 5)
  })

  it('seatTexturizerVertices centers XY and floors Z', () => {
    const seated = seatTexturizerVertices(offsetCube()).vertices
    let minZ = Infinity
    let minX = Infinity
    let maxX = -Infinity
    for (let i = 0; i < seated.length; i += 3) {
      if (seated[i]! < minX) minX = seated[i]!
      if (seated[i]! > maxX) maxX = seated[i]!
      if (seated[i + 2]! < minZ) minZ = seated[i + 2]!
    }
    expect(minZ).toBeCloseTo(0, 5)
    expect((minX + maxX) * 0.5).toBeCloseTo(0, 5)
  })
})
