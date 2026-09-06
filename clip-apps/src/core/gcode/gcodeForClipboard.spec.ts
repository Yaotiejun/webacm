import { describe, expect, it } from 'vitest'
import { gcodeForClipboard } from './gcodeForClipboard'

describe('gcodeForClipboard', () => {
  it('passes through short text', () => {
    expect(gcodeForClipboard('G1 X1', 10)).toEqual({ text: 'G1 X1', truncated: false })
  })

  it('truncates long text', () => {
    const long = 'X'.repeat(20)
    const { truncated } = gcodeForClipboard(long, 10)
    expect(truncated).toBe(true)
  })
})
