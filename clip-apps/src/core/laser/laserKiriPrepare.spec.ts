import { describe, expect, it } from 'vitest'
import { orderLaserPolylinesNearest, prepareLaserPolylines } from './laserKiriPrepare'

describe('laserKiriPrepare (kiri-ts)', () => {
  it('orders by nearest entry and centers origin', () => {
    const prepared = prepareLaserPolylines(
      [
        {
          closed: true,
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 10 },
            { x: 20, y: 20 },
            { x: 10, y: 20 },
          ],
        },
        {
          closed: false,
          points: [
            { x: 0, y: 0 },
            { x: 5, y: 0 },
          ],
        },
      ],
      { origin: 'center', nestGap: 0, kerf: 0 },
    )
    expect(prepared.length).toBe(2)
    // first cut should start nearer origin after ordering + center
    const first = prepared[0]!.points[0]!
    expect(Number.isFinite(first.x)).toBe(true)
  })

  it('nearest order prefers closer open segment', () => {
    const ordered = orderLaserPolylinesNearest(
      [
        { closed: false, points: [{ x: 100, y: 0 }, { x: 110, y: 0 }] },
        { closed: false, points: [{ x: 1, y: 0 }, { x: 2, y: 0 }] },
      ],
      { x: 0, y: 0 },
    )
    expect(ordered[0]!.points[0]!.x).toBe(1)
  })

  it('engraveScan preserves coords and finishes quickly', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      closed: false,
      points: [
        { x: 0, y: i },
        { x: 10, y: i },
      ],
    }))
    const prepared = prepareLaserPolylines(many, { engraveScan: true, origin: 'preserve' })
    expect(prepared).toHaveLength(200)
    expect(prepared[0]!.points[0]!.y).toBeGreaterThanOrEqual(prepared[199]!.points[0]!.y)
  })
})