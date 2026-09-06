import { describe, expect, it } from 'vitest'
import { toCenteredGray } from './displacementMath'

describe('toCenteredGray', () => {
  it('keeps grayscale unchanged when symmetric displacement disabled', () => {
    expect(toCenteredGray(0, false)).toBe(0)
    expect(toCenteredGray(0.5, false)).toBe(0.5)
    expect(toCenteredGray(1, false)).toBe(1)
  })

  it('centers grayscale around 0.5 when symmetric displacement enabled', () => {
    expect(toCenteredGray(0, true)).toBe(-0.5)
    expect(toCenteredGray(0.5, true)).toBe(0)
    expect(toCenteredGray(1, true)).toBe(0.5)
  })
})
