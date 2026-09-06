import { describe, expect, it } from 'vitest'
import { isGridbotPrintRunActive } from './gridbotPrintRun'

describe('gridbotPrintRun', () => {
  it('matches grip status.print.run while sending', () => {
    expect(
      isGridbotPrintRunActive({ sending: true, printPrepAt: null, printEndedAt: null }),
    ).toBe(true)
  })

  it('is active between prep and end', () => {
    expect(
      isGridbotPrintRunActive({ sending: false, printPrepAt: 1, printEndedAt: null }),
    ).toBe(true)
    expect(
      isGridbotPrintRunActive({ sending: false, printPrepAt: 1, printEndedAt: 2 }),
    ).toBe(false)
  })
})
