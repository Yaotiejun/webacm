import { describe, expect, it } from 'vitest'
import { formatGripLogRecord, formatGripLogTimestamp } from './gripLogFormat'

describe('gripLogFormat', () => {
  it('formats YYMMDD.HHmmss like log-util', () => {
    const t = new Date(2026, 4, 19, 14, 5, 7)
    expect(formatGripLogTimestamp(t)).toBe('260519.140507')
  })

  it('joins JSON args for file-style emit', () => {
    const t = new Date(2026, 0, 2, 9, 30, 0)
    expect(formatGripLogRecord(t, ['hello', { n: 1 }])).toBe(
      '260102.093000 "hello" {"n":1}',
    )
  })
})
