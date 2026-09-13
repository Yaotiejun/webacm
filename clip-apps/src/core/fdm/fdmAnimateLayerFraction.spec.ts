import { describe, expect, it } from 'vitest'
import {
  clampUnitFraction,
  trimLayerPathsByFraction,
  trimPolylineByFraction,
} from '@/core/fdm/fdmAnimateLayerFraction'

describe('fdmAnimateLayerFraction', () => {
  it('clamps fraction to unit interval', () => {
    expect(clampUnitFraction(-1)).toBe(0)
    expect(clampUnitFraction(0.5)).toBe(0.5)
    expect(clampUnitFraction(2)).toBe(1)
    expect(clampUnitFraction(Number.NaN)).toBe(0)
  })

  it('trims polyline by segment fraction', () => {
    const pts = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]
    expect(trimPolylineByFraction(pts, 0)).toEqual([])
    expect(trimPolylineByFraction(pts, 1)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ])
    // 1/3 of 3 segs → 1 seg → 2 points
    expect(trimPolylineByFraction(pts, 1 / 3)).toEqual([
      [0, 0],
      [1, 0],
    ])
  })

  it('reveals layer paths in order across cumulative segments', () => {
    const paths = [
      {
        type: 'perimeter',
        points: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      },
      {
        type: 'infill',
        points: [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
      },
      { type: 'travel', points: [[0, 0], [9, 9]] },
    ]
    // total printable segs = 2+2 = 4; half → 2 segs → first path fully
    const half = trimLayerPathsByFraction(paths, 0.5)
    expect(half).toHaveLength(1)
    expect(half[0]!.type).toBe('perimeter')
    expect(half[0]!.points).toHaveLength(3)

    const full = trimLayerPathsByFraction(paths, 1)
    expect(full).toHaveLength(2)
    expect(full.map((p) => p.type)).toEqual(['perimeter', 'infill'])
  })
})
