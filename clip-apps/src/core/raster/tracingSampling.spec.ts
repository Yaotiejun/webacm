import { describe, expect, it } from 'vitest'
import {
  countTracingPoints,
  enforceTracingPointBudget,
  normalizeTracingPaths,
  sampleTracingPolyline,
  sanitizeTracingPathPoints,
  simplifyTracingPolylineRdp,
} from './tracingSampling'

describe('raster.tracingSampling', () => {
  it('removes adjacent duplicate points', () => {
    const out = sanitizeTracingPathPoints([
      [0, 0],
      [0, 0],
      [1, 1],
      [1, 1],
      [2, 2],
    ])
    expect(out).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ])
  })

  it('samples long segments by step and keeps endpoint', () => {
    const out = sampleTracingPolyline(
      [
        [0, 0],
        [10, 0],
      ],
      3
    )
    expect(out[0]).toEqual([0, 0])
    expect(out[out.length - 1]).toEqual([10, 0])
    expect(out.length).toBeGreaterThanOrEqual(4)
  })

  it('uses denser sampling near sharp corners', () => {
    const corner = sampleTracingPolyline(
      [
        [0, 0],
        [6, 0],
        [6, 6],
      ],
      5
    )
    const straight = sampleTracingPolyline(
      [
        [0, 0],
        [6, 0],
        [12, 0],
      ],
      5
    )
    expect(corner.length).toBeGreaterThan(straight.length)
  })

  it('drops invalid paths after normalization', () => {
    const out = normalizeTracingPaths([
      { points: [[0, 0], [0, 0]] },
      { points: [[1, 1], [2, 2]] },
    ])
    expect(out.length).toBe(1)
    expect(out[0]?.points).toEqual([
      [1, 1],
      [2, 2],
    ])
  })

  it('increases simplification strength with larger base step', () => {
    const path = {
      points: [
        [0, 0],
        [1, 0.02],
        [2, -0.02],
        [3, 0.02],
        [4, -0.02],
        [5, 0],
      ] as Array<[number, number]>,
    }
    const fine = normalizeTracingPaths([path], 0.2)
    const coarse = normalizeTracingPaths([path], 2)
    expect(fine[0]?.points.length ?? 0).toBeGreaterThanOrEqual(coarse[0]?.points.length ?? 0)
    expect(coarse[0]?.points[0]).toEqual([0, 0])
    expect(coarse[0]?.points[coarse[0].points.length - 1]).toEqual([5, 0])
  })

  it('simplifies near-collinear points while preserving endpoints', () => {
    const out = simplifyTracingPolylineRdp(
      [
        [0, 0],
        [1, 0.00001],
        [2, -0.00001],
        [3, 0],
      ],
      0.001
    )
    expect(out[0]).toEqual([0, 0])
    expect(out[out.length - 1]).toEqual([3, 0])
    expect(out.length).toBe(2)
  })

  it('enforces tracing point budget with endpoint preservation', () => {
    const sampled = [
      sampleTracingPolyline(
        [
          [0, 0],
          [20, 0],
        ],
        1
      ),
      sampleTracingPolyline(
        [
          [0, 1],
          [20, 1],
        ],
        1
      ),
    ]
    const before = countTracingPoints(sampled)
    const reduced = enforceTracingPointBudget(sampled, 12)
    const after = countTracingPoints(reduced)
    expect(before).toBeGreaterThan(12)
    expect(after).toBeLessThanOrEqual(12)
    expect(reduced[0]?.[0]).toEqual([0, 0])
    expect(reduced[0]?.[reduced[0].length - 1]).toEqual([20, 0])
  })
})
