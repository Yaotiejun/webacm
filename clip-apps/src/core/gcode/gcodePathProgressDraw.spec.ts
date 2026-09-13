import { describe, expect, it } from 'vitest'
import { applyPathProgressDrawRanges } from '@/core/gcode/gcodePathProgressDraw'

function mockTarget(n: number) {
  let range = { start: 0, count: n }
  return {
    setDrawRange: (start: number, count: number) => {
      range = { start, count }
    },
    getVertexCount: () => n,
    get range() {
      return range
    },
  }
}

describe('gcodePathProgressDraw', () => {
  it('shows all vertices at fraction 1', () => {
    const a = mockTarget(10)
    const b = mockTarget(6)
    applyPathProgressDrawRanges([a, b], 1)
    expect(a.range).toEqual({ start: 0, count: 10 })
    expect(b.range).toEqual({ start: 0, count: 6 })
  })

  it('hides later lines when fraction is small', () => {
    const a = mockTarget(10)
    const b = mockTarget(10)
    applyPathProgressDrawRanges([a, b], 0.25)
    expect(a.range.count).toBe(5)
    expect(b.range.count).toBe(0)
  })

  it('hides all at fraction 0', () => {
    const a = mockTarget(8)
    applyPathProgressDrawRanges([a], 0)
    expect(a.range.count).toBe(0)
  })
})
