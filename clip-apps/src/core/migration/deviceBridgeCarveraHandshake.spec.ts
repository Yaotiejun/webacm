import { describe, expect, it } from 'vitest'
import {
  parseGrblAlarmLine,
  parseGrblBannerLine,
  parseGrblErrorLine,
} from '@/core/devices/grblLineParse'
import { evaluateCarveraLaserProbeSoak } from '@/core/devices/carveraLaserProbeSoak'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from './deviceBridgeCarveraMockStatus'
import {
  DEVICE_BRIDGE_CARVERA_MOCK_DOLLAR_LINES,
  DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER,
  DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM,
  DEVICE_BRIDGE_CARVERA_MOCK_SETTINGS_ERROR,
} from './deviceBridgeCarveraHandshake'

describe('deviceBridgeCarveraHandshake', () => {
  it('mock banner, alarm, and settings error lines parse like grip', () => {
    expect(parseGrblBannerLine(DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER)?.version).toBe('1.1h')
    expect(parseGrblAlarmLine(DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM)).toBe(9)
    expect(parseGrblErrorLine(DEVICE_BRIDGE_CARVERA_MOCK_SETTINGS_ERROR)).toBe('2')
    expect(DEVICE_BRIDGE_CARVERA_MOCK_DOLLAR_LINES.every((l) => /^\$\d+=/.test(l))).toBe(true)
  })

  it('mock status line passes carve-control soak evaluator', () => {
    const r = evaluateCarveraLaserProbeSoak([
      { line: DEVICE_BRIDGE_CARVERA_MOCK_STATUS, parsed: null, at: 0 },
    ])
    expect(r.ok).toBe(true)
    expect(r.sawLaser).toBe(true)
    expect(r.sawProbe).toBe(true)
    expect(r.sawSetup).toBe(true)
    expect(r.sawHalt).toBe(true)
  })
})
