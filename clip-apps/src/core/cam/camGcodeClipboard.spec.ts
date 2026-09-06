import { describe, expect, it } from 'vitest'
import { camGcodeForClipboard } from './camGcodeClipboard'

describe('camGcodeForClipboard', () => {
  it('passes through short text', () => {
    expect(camGcodeForClipboard('G1 X1', 10)).toEqual({ text: 'G1 X1', truncated: false })
  })

  it('truncates long text', () => {
    const long = 'X'.repeat(20)
    const { text, truncated } = camGcodeForClipboard(long, 10)
    expect(truncated).toBe(true)
    expect(text.length).toBeLessThanOrEqual(10 + 80)
  })
})
