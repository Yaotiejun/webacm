import { describe, expect, it } from 'vitest'
import { Box3 } from 'three'
import {
  applyRasterSeat,
  buildRasterTerrainArrangeMesh,
  buildRasterToolArrangeMesh,
  seatRasterVertices,
} from './rasterArrangeMesh'

function unitCube(): Float32Array {
  return new Float32Array([
    1, 1, 0, 11, 1, 0, 11, 11, 0,
    1, 1, 0, 11, 11, 0, 1, 11, 0,
    1, 1, 1, 11, 1, 1, 11, 11, 1,
    1, 1, 1, 11, 11, 1, 1, 11, 1,
  ])
}

describe('rasterArrangeMesh', () => {
  it('builds seated terrain mesh with min Y at bed', () => {
    const mesh = buildRasterTerrainArrangeMesh(unitCube())
    const box = new Box3().setFromObject(mesh)
    expect(box.isEmpty()).toBe(false)
    expect(box.min.y).toBeCloseTo(0, 5)
    expect((box.min.x + box.max.x) * 0.5).toBeCloseTo(0, 5)
    expect((box.min.z + box.max.z) * 0.5).toBeCloseTo(0, 5)
  })

  it('keeps tool aligned when using terrain seat', () => {
    const terrain = unitCube()
    const seat = seatRasterVertices(terrain)
    const toolRaw = new Float32Array([6, 6, 0, 7, 6, 0, 7, 7, 0])
    const aligned = applyRasterSeat(toolRaw, seat)
    expect(aligned[0]).toBeCloseTo(6 - seat.cx, 5)
    expect(aligned[1]).toBeCloseTo(6 - seat.cy, 5)
    expect(aligned[2]).toBeCloseTo(0 - seat.minZ, 5)
    const mesh = buildRasterToolArrangeMesh(toolRaw, seat)
    expect(mesh.name).toBe('raster-tool-arrange-mesh')
  })
})
