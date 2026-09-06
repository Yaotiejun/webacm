import { parseGrblAlarmLine, parseGrblBannerLine } from '@/core/devices/grblLineParse'
import {
  DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER,
  DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM,
} from '@/core/migration/deviceBridgeCarveraHandshake'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from '@/core/migration/deviceBridgeCarveraMockStatus'
import {
  evaluateCarveraProductionSoak,
  type CarveraProductionSoakSample,
} from '@/core/devices/carveraProductionSoak'

export interface CarveraMigrationCompleteResult {
  ok: boolean
  checks: {
    productionSoakMock: boolean
    alarmParse: boolean
    bannerParse: boolean
    spinPlayOnMock: boolean
  }
  errors: string[]
}

function mockStatusSamples(n = 10): CarveraProductionSoakSample[] {
  return Array.from({ length: n }, (_, i) => ({
    line: DEVICE_BRIDGE_CARVERA_MOCK_STATUS,
    parsed: null,
    at: i,
  }))
}

/** Migration gate: Carvera status parse + production soak on bridge mock contract. */
export function evaluateCarveraMigrationComplete(): CarveraMigrationCompleteResult {
  const errors: string[] = []
  const soak = evaluateCarveraProductionSoak(mockStatusSamples())
  if (!soak.ok) errors.push(...soak.errors.map((e) => `soak: ${e}`))

  const alarmOk = parseGrblAlarmLine(DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM) === 9
  if (!alarmOk) errors.push('ALARM parse failed')

  const bannerOk = parseGrblBannerLine(DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER)?.version === '1.1h'
  if (!bannerOk) errors.push('Grbl banner parse failed')

  const spinPlay =
    soak.sawLaser &&
    soak.sawProbe &&
    DEVICE_BRIDGE_CARVERA_MOCK_STATUS.includes('|S:') &&
    DEVICE_BRIDGE_CARVERA_MOCK_STATUS.includes('|P:')
  if (!spinPlay) errors.push('mock status missing S/P spin/play fields')

  return {
    ok: errors.length === 0,
    checks: {
      productionSoakMock: soak.ok,
      alarmParse: alarmOk,
      bannerParse: bannerOk,
      spinPlayOnMock: spinPlay,
    },
    errors,
  }
}
