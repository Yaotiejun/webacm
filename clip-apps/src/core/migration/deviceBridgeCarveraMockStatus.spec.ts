import { describe, expect, it } from 'vitest'
import { parseGrblStatusReport } from '@/core/devices/grblLineParse'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from './deviceBridgeCarveraMockStatus'

describe('deviceBridgeCarveraMockStatus', () => {
  it('mock status line parses all carve-control fields', () => {
    const s = parseGrblStatusReport(DEVICE_BRIDGE_CARVERA_MOCK_STATUS)
    expect(s?.runState).toBe('IDLE')
    expect(s?.mpos).toEqual({ x: 0, y: 0, z: 0 })
    expect(s?.wpos).toEqual({ x: 0, y: 0, z: 0 })
    expect(s?.feed?.overridePct).toBe(100)
    expect(s?.spin?.target).toBe(10000)
    expect(s?.laser?.target).toBe(255)
    expect(s?.probe?.voltage).toBe(3.3)
    expect(s?.play).toEqual({ line: 0, percent: 0, seconds: 0 })
    expect(s?.setup).toEqual({ state: 0 })
    expect(s?.halt).toEqual({ code: 0 })
    expect(s?.buf).toBe(15)
  })
})
