import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GRIDBOT_BUF_FLOW_TIMEOUT_MS } from './gridbotFlowTimeoutRecovery'
import { GridbotAckSendQueue, marlinChecksumLine } from './gridbotAckSendQueue'

describe('gridbotAckSendQueue', () => {
  it('marlinChecksumLine matches grip N* format', () => {
    const out = marlinChecksumLine('G28', 1)
    expect(out).toMatch(/^N1 G28\*\d+$/)
  })

  it('pumps with bufmax window until ok', () => {
    const q = new GridbotAckSendQueue({ bufmax: 2, advancedOk: false })
    q.enqueue(['G28', 'G1 X1', 'G1 X2'])
    const sent: string[] = []
    expect(q.pump((l) => sent.push(l))).toBe(2)
    expect(sent).toEqual(['G28', 'G1 X1'])
    expect(q.unackedCount).toBe(2)

    q.handleOk('ok', (l) => sent.push(l))
    expect(sent).toEqual(['G28', 'G1 X1', 'G1 X2'])
    expect(q.isFinished()).toBe(false)

    q.handleOk('ok', () => {})
    q.handleOk('ok', () => {})
    expect(q.isFinished()).toBe(true)
  })

  it('replays history on Resend', () => {
    const q = new GridbotAckSendQueue({ bufmax: 8, advancedOk: false })
    q.enqueue(['G28', 'G1 X1', 'G1 X2'])
    const sent: string[] = []
    q.pump((l) => sent.push(l))
    q.handleOk('ok', () => {})
    q.handleOk('ok', () => {})
    sent.length = 0
    expect(q.handleIncoming('Resend: 2', (l) => sent.push(l))).toBe(true)
    expect(sent).toEqual(['G1 X1', 'G1 X2'])
  })

  it('holds pump when B/P slots below bufmax/5 (grip flow gate)', () => {
    const q = new GridbotAckSendQueue({ bufmax: 8, advancedOk: true })
    q.enqueue(['G28', 'G1 X1'])
    const sent: string[] = []
    const send = (l: string) => sent.push(l)

    expect(q.pump(send)).toBe(2)
    expect(q.unackedCount).toBe(2)
    q.handleOk('ok B1 P20', send)
    expect(q.isFlowBlocked()).toBe(true)
    expect(q.pump(send)).toBe(0)

    q.handleOk('ok B8 P20', send)
    expect(q.isFlowBlocked()).toBe(false)
    expect(q.isFinished()).toBe(true)
    expect(sent).toHaveLength(2)
  })

  it('fires print body handler when M117 Start is acked', () => {
    const q = new GridbotAckSendQueue({ bufmax: 4, advancedOk: false })
    let started = false
    q.setPrintBodyStartHandler(() => {
      started = true
    })
    q.enqueue(['G28', 'M117 Start', 'G1 X1'])
    const sent: string[] = []
    const send = (l: string) => sent.push(l)
    q.pump(send)
    expect(started).toBe(false)
    q.handleOk('ok', send)
    q.handleOk('ok', send)
    expect(started).toBe(true)
    q.handleOk('ok', send)
    q.dispose()
  })

  describe('flow timeout recovery', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('resumes pump after buf_timer when no further ok', () => {
      const q = new GridbotAckSendQueue({ bufmax: 5, advancedOk: true })
      let woke = false
      q.setFlowRecoveredHandler(() => {
        woke = true
      })
      q.enqueue(['G28', 'G1', 'G2', 'G3', 'G4', 'G5'])
      const sent: string[] = []
      const send = (l: string) => sent.push(l)

      expect(q.pump(send)).toBe(5)
      q.handleOk('ok B1 P20', send)
      expect(q.isFlowBlocked()).toBe(true)
      expect(q.pump(send)).toBe(0)

      vi.advanceTimersByTime(GRIDBOT_BUF_FLOW_TIMEOUT_MS)
      expect(woke).toBe(true)
      expect(q.getFlowTimeoutRecovery()).toBe('buffer')
      expect(q.isFlowBlocked()).toBe(false)
      expect(sent).toHaveLength(6)
      q.dispose()
    })
  })
})
