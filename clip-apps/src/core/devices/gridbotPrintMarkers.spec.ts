import { describe, expect, it } from 'vitest'
import { isGridbotM117StartLine } from './gridbotPrintMarkers'

describe('gridbotPrintMarkers', () => {
  it('detects grip M117 Start marker', () => {
    expect(isGridbotM117StartLine('M117 Start')).toBe(true)
    expect(isGridbotM117StartLine('  M117 Start print')).toBe(true)
    expect(isGridbotM117StartLine('M117 Done')).toBe(false)
    expect(isGridbotM117StartLine('G28')).toBe(false)
  })
})
