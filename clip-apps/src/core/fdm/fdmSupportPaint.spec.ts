import { describe, expect, it } from 'vitest'
import {
  appendPaintIfSpaced,
  erasePaintNear,
  paintStrokeSpacing,
  type FdmPaintPoint,
} from './fdmSupportPaint'
import * as THREE from 'three'
import { syncPaintOverlayGroup } from './fdmSupportPaint'

describe('fdmSupportPaint stroke', () => {
  it('appendPaintIfSpaced densifies only when spaced', () => {
    const list: FdmPaintPoint[] = []
    const r = 2.5
    const sp = paintStrokeSpacing(r)
    expect(appendPaintIfSpaced(list, { x: 0, y: 0, z: 0 }, r)).toBe(true)
    expect(appendPaintIfSpaced(list, { x: sp * 0.2, y: 0, z: 0 }, r)).toBe(false)
    expect(appendPaintIfSpaced(list, { x: sp * 1.5, y: 0, z: 0 }, r)).toBe(true)
    expect(list).toHaveLength(2)
  })

  it('erasePaintNear removes nearby points', () => {
    const list: FdmPaintPoint[] = [
      { point: { x: 0, y: 0, z: 0 }, radius: 2 },
      { point: { x: 10, y: 0, z: 0 }, radius: 2 },
    ]
    const next = erasePaintNear(list, { x: 0.5, y: 0, z: 0 }, 2)
    expect(next).toHaveLength(1)
    expect(next[0]!.point.x).toBe(10)
  })

  it('syncPaintOverlayGroup creates spheres', () => {
    const group = new THREE.Group()
    syncPaintOverlayGroup(group, [{ paint: [{ point: { x: 1, y: 2, z: 3 }, radius: 2 }] }])
    expect(group.children.length).toBe(1)
    syncPaintOverlayGroup(group, [{ paint: [] }])
    expect(group.children.length).toBe(0)
  })
})
