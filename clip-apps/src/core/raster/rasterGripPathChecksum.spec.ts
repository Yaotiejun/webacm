import { describe, expect, it } from 'vitest'
import {
  gripPlanarPathDataChecksum,
  gripPlanarPathsChecksum,
  gripRadialStripsChecksum,
} from './rasterGripPathChecksum'

describe('rasterGripPathChecksum', () => {
  it('matches grip planar weighted checksum', () => {
    const data = new Float32Array([1, 2, 3, 4])
    expect(gripPlanarPathDataChecksum(data)).toBe((1 * 1 + 2 * 2 + 3 * 3 + 4 * 4) | 0)
  })

  it('checksums paths by flattened Z order', () => {
    const c = gripPlanarPathsChecksum([
      { points: [[0, 0, 1], [1, 0, 2]] },
      { points: [[0, 1, 3]] },
    ])
    expect(c).toBe(gripPlanarPathDataChecksum([1, 2, 3]))
  })

  it('matches grip radial strip checksum', () => {
    const c = gripRadialStripsChecksum([
      [1, 2],
      [3, 4],
    ])
    let expected = 0
    expected = (expected + 1 * 1) | 0
    expected = (expected + 2 * 2) | 0
    expected = (expected + 3 * 3) | 0
    expected = (expected + 4 * 4) | 0
    expect(c).toBe(expected)
  })
})
