import { describe, expect, it } from 'vitest'
import { resolveMeshBounds } from './meshBounds'

describe('resolveMeshBounds', () => {
  it('computes min/max/center/size for mixed coordinates', () => {
    const src = new Float32Array([
      -2, 3, 1,
      4, -1, 5,
      0, 2, -3,
    ])
    const b = resolveMeshBounds(src)
    expect(b.min).toEqual({ x: -2, y: -1, z: -3 })
    expect(b.max).toEqual({ x: 4, y: 3, z: 5 })
    expect(b.center).toEqual({ x: 1, y: 1, z: 1 })
    expect(b.size).toEqual({ x: 6, y: 4, z: 8 })
  })
})
