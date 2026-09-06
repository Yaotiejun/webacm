import { runCarveraProductionSoak } from '@/core/devices/carveraProductionSoakRunner'
import {
  carveraProductionSoakWebSocketUrl,
  evaluateCarveraProductionSoak,
} from '@/core/devices/carveraProductionSoak'
import { runGridbotProductionSoak } from '@/core/devices/gridbotProductionSoakRunner'
import {
  evaluateGridbotProductionSoak,
  gridbotProductionSoakWebSocketUrl,
} from '@/core/devices/gridbotProductionSoak'
import {
  DEVICE_BRIDGE_CARVERA_MOCK_STATUS,
} from '@/core/migration/deviceBridgeCarveraMockStatus'
import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK,
} from '@/core/migration/deviceBridgeGridbotMockStatus'

export type DeviceSoakPhase = 'skipped' | 'mock-ok' | 'live-ok' | 'live-failed'

export interface DeviceProductionSoakMigrationResult {
  ok: boolean
  carvera: { phase: DeviceSoakPhase; errors: string[] }
  gridbot: { phase: DeviceSoakPhase; errors: string[] }
  errors: string[]
}

function evaluateCarveraMockContract(): { ok: boolean; errors: string[] } {
  const samples = Array.from({ length: 10 }, (_, i) => ({
    line: DEVICE_BRIDGE_CARVERA_MOCK_STATUS,
    parsed: null,
    at: i,
  }))
  const r = evaluateCarveraProductionSoak(samples)
  return { ok: r.ok, errors: r.errors }
}

function evaluateGridbotMockContract(): { ok: boolean; errors: string[] } {
  const r = evaluateGridbotProductionSoak([
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE, at: 0 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE, at: 1 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK, at: 2 },
    { line: 'ok B14 P15', at: 3 },
  ])
  return { ok: r.ok, errors: r.errors }
}

/**
 * Phase 2 — device production soak.
 * Set `DEVICE_PRODUCTION_SOAK=1` and `CARVERA_SOAK_WS` / `GRIDBOT_SOAK_WS` for live TCP/mock bridge.
 */
export async function evaluateDeviceProductionSoakMigration(): Promise<DeviceProductionSoakMigrationResult> {
  const errors: string[] = []
  const requireLive = process.env.DEVICE_PRODUCTION_SOAK === '1'
  const carveraWs = carveraProductionSoakWebSocketUrl()
  const gridbotWs = gridbotProductionSoakWebSocketUrl()

  const carveraMock = evaluateCarveraMockContract()
  const gridbotMock = evaluateGridbotMockContract()
  if (!carveraMock.ok) errors.push(`carvera mock: ${carveraMock.errors.join('; ')}`)
  if (!gridbotMock.ok) errors.push(`gridbot mock: ${gridbotMock.errors.join('; ')}`)

  let carveraPhase: DeviceSoakPhase = carveraMock.ok ? 'mock-ok' : 'live-failed'
  let gridbotPhase: DeviceSoakPhase = gridbotMock.ok ? 'mock-ok' : 'live-failed'
  const carveraErrors: string[] = [...carveraMock.errors]
  const gridbotErrors: string[] = [...gridbotMock.errors]

  if (!requireLive) {
    return {
      ok: carveraMock.ok && gridbotMock.ok,
      carvera: { phase: carveraPhase, errors: carveraErrors },
      gridbot: { phase: gridbotPhase, errors: gridbotErrors },
      errors,
    }
  }

  if (carveraWs) {
    try {
      const live = await runCarveraProductionSoak({ endpoint: carveraWs })
      if (live.ok) {
        carveraPhase = 'live-ok'
        carveraErrors.length = 0
      } else {
        carveraPhase = 'live-failed'
        carveraErrors.push(...live.errors)
        errors.push(`carvera live: ${live.errors.join('; ')}`)
      }
    } catch (e) {
      carveraPhase = 'live-failed'
      const msg = e instanceof Error ? e.message : String(e)
      carveraErrors.push(msg)
      errors.push(`carvera live: ${msg}`)
    }
  } else {
    errors.push('DEVICE_PRODUCTION_SOAK=1 but CARVERA_SOAK_WS unset')
    carveraPhase = 'live-failed'
    carveraErrors.push('CARVERA_SOAK_WS unset')
  }

  if (gridbotWs) {
    try {
      const live = await runGridbotProductionSoak({ endpoint: gridbotWs })
      if (live.ok) {
        gridbotPhase = 'live-ok'
        gridbotErrors.length = 0
      } else {
        gridbotPhase = 'live-failed'
        gridbotErrors.push(...live.errors)
        errors.push(`gridbot live: ${live.errors.join('; ')}`)
      }
    } catch (e) {
      gridbotPhase = 'live-failed'
      const msg = e instanceof Error ? e.message : String(e)
      gridbotErrors.push(msg)
      errors.push(`gridbot live: ${msg}`)
    }
  } else {
    errors.push('DEVICE_PRODUCTION_SOAK=1 but GRIDBOT_SOAK_WS unset')
    gridbotPhase = 'live-failed'
    gridbotErrors.push('GRIDBOT_SOAK_WS unset')
  }

  return {
    ok: errors.length === 0,
    carvera: { phase: carveraPhase, errors: carveraErrors },
    gridbot: { phase: gridbotPhase, errors: gridbotErrors },
    errors,
  }
}
