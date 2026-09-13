import { describe, expect, it, vi } from 'vitest'
import { CarveraAckSendQueue, isCarveraOkLine } from './carveraAckSendQueue'

describe('carveraAckSendQueue', () => {
  it('isCarveraOkLine matches ok', () => {
    expect(isCarveraOkLine('ok')).toBe(true)
    expect(isCarveraOkLine('OK')).toBe(true)
    expect(isCarveraOkLine(' ok ')).toBe(true)
    expect(isCarveraOkLine('error:1')).toBe(false)
  })

  it('serial pump waits for ok between lines when buf unknown', () => {
    const q = new CarveraAckSendQueue()
    q.enqueue(['G28', 'G1 X1'])
    const send = vi.fn()
    expect(q.pump(send, undefined)).toBe(1)
    expect(send).toHaveBeenCalledWith('G28')
    expect(q.unackedCount).toBe(1)
    expect(q.isFinished()).toBe(false)

    expect(q.handleOk()).toBe(true)
    expect(q.pump(send, undefined)).toBe(1)
    expect(send).toHaveBeenLastCalledWith('G1 X1')
    q.handleOk()
    expect(q.isFinished()).toBe(true)
  })

  it('holds when plannerBuf below min', () => {
    const q = new CarveraAckSendQueue({ minPlannerBuf: 2, maxInFlight: 3 })
    q.enqueue(['G0 X0', 'G0 Y0'])
    const send = vi.fn()
    expect(q.needsFlowWait(1)).toBe(true)
    expect(q.pump(send, 1)).toBe(0)
    expect(send).toHaveBeenCalledTimes(0)
    // buf ok — can fill up to maxInFlight
    expect(q.pump(send, 4)).toBe(2)
    expect(send).toHaveBeenCalledTimes(2)
  })
})
