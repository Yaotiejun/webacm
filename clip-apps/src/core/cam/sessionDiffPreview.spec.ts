import { describe, expect, it } from 'vitest'
import {
  buildApplyConfirmMessage,
  buildChangedKeyDiffLines,
  buildOpsApplyDiffPreviewLine,
  countRiskLevels,
  formatRemainingRiskBreakdown,
  formatRiskStatsLine,
} from './sessionDiffPreview'

describe('cam.sessionDiffPreview', () => {
  it('sorts diff lines by risk level priority', () => {
    const lines = buildChangedKeyDiffLines(
      { camStockX: 100, camFastFeed: 1000, camZBottom: -1 },
      { camStockX: 120, camFastFeed: 900, camZBottom: -2 },
      ['camStockX', 'camFastFeed', 'camZBottom'],
      3,
    )
    expect(lines[0]?.startsWith('camZBottom !!')).toBe(true)
    expect(lines[1]?.startsWith('camFastFeed !')).toBe(true)
    expect(lines[2]?.startsWith('camStockX')).toBe(true)
  })

  it('formats risk stats and remaining breakdown', () => {
    expect(formatRiskStatsLine(2, 1)).toBe('风险统计: 🟥高风险=2, 🟧中风险=1')
    const remain = formatRemainingRiskBreakdown(['camZBottom', 'camFastFeed', 'camStockX'], 1)
    expect(remain).toContain('... +2 项')
    expect(remain).toContain('🟥0/🟧2/低0')
  })

  it('builds ops preview line and risk counts', () => {
    expect(buildOpsApplyDiffPreviewLine(3, 5)).toBe('ops !!: [array:3] -> [array:5]')
    expect(countRiskLevels(['ops', 'camFastFeed', 'camStockX'])).toEqual({ high: 1, medium: 2, low: 0 })
  })

  it('builds apply confirm message from aggregate inputs', () => {
    const msg = buildApplyConfirmMessage('process', 2, ['camZBottom', 'camFastFeed'], ['camZBottom !!: 0 -> -1'])
    expect(msg).toContain('即将应用会话包字段: process')
    expect(msg).toContain('预计影响字段数: 2')
    expect(msg).toContain('风险统计: 🟥高风险=1, 🟧中风险=1')
  })
})
