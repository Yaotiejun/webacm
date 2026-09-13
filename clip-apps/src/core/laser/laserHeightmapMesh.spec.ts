import { describe, expect, it } from 'vitest'
import { buildLaserHeightmapArrangeMesh } from './laserHeightmapMesh'
import type { LaserHeightmap } from './laserImageHeightmap'

describe('laserHeightmapMesh', () => {
  it('builds a mesh with grid vertices', () => {
    const w = 8
    const h = 6
    const z = new Float32Array(w * h)
    for (let i = 0; i < z.length; i += 1) z[i] = (i % w) * 0.1
    const hm: LaserHeightmap = {
      width: w,
      height: h,
      z,
      scale: 1,
      widthMm: w,
      heightMm: h,
      zMax: 1,
    }
    const mesh = buildLaserHeightmapArrangeMesh(hm)
    expect(mesh.geometry.getAttribute('position').count).toBe(w * h)
    expect(mesh.geometry.getIndex()!.count).toBe((w - 1) * (h - 1) * 6)
  })
})