import { describe, expect, it } from 'vitest'
import { Box3, Group } from 'three'
import { buildSlaArrangeMesh, seatSlaVertices } from './slaArrangeMesh'
import { buildSlaSliceOverlay, clearSlaSliceOverlay } from './slaSliceOverlay'
import { slaGoldenCube10mm } from './slaGoldenProfile'

describe('slaArrangeMesh', () => {
  it('builds a seated mesh centered on bed with min Z at 0', () => {
    const mesh = buildSlaArrangeMesh(slaGoldenCube10mm())
    const box = new Box3().setFromObject(mesh)
    expect(box.isEmpty()).toBe(false)
    expect(box.min.y).toBeCloseTo(0, 5)
    expect((box.min.x + box.max.x) * 0.5).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) * 0.5).toBeCloseTo(0, 5)
    expect(box.max.y).toBeCloseTo(10, 5)
  })

  it('seatSlaVertices centers XY and floors Z', () => {
    const seated = seatSlaVertices(slaGoldenCube10mm()).vertices
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

describe('slaSliceOverlay', () => {
  it('adds face+line children for active layers', () => {
    const g = new Group()
    buildSlaSliceOverlay(
      g,
      [
        { z: 0.5, fills: [[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]] },
        { z: 1.5, fills: [[{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }]] },
      ],
      1,
    )
    expect(g.children.length).toBe(4)
    clearSlaSliceOverlay(g)
    expect(g.children.length).toBe(0)
  })
})
