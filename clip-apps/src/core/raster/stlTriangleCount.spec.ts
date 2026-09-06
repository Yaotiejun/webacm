import { describe, expect, it } from 'vitest'
import { stlTriangleCountFromPositionCount, stlTriangleCountFromPositions } from './stlTriangleCount'

describe('stlTriangleCount', () => {
  it('maps grip baseline terrain/tool face counts', () => {
    expect(stlTriangleCountFromPositionCount(226_758)).toBe(75_586)
    expect(stlTriangleCountFromPositionCount(2_880)).toBe(960)
  })

  it('derives face count from STL position buffer', () => {
    const positions = new Float32Array(9 * 4)
    expect(stlTriangleCountFromPositions(positions)).toBe(4)
  })
})
