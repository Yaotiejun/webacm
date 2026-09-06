import {
  DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE,
  DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE,
} from '@/core/migration/deviceBridgeGridbotMockStatus'
import { evaluateGridbotProductionSoak } from '@/core/devices/gridbotProductionSoak'
import { isGridbotM117StartLine } from '@/core/devices/gridbotPrintMarkers'
import { parseGridbotAdvancedOkLine } from '@/core/devices/gridbotAdvancedOk'

export interface GridbotMigrationCompleteResult {
  ok: boolean
  checks: {
    productionSoakMock: boolean
    advancedOkParse: boolean
    m117Marker: boolean
  }
  errors: string[]
}

/** Migration gate: GridBot Marlin parse + production soak on bridge mock lines. */
export function evaluateGridbotMigrationComplete(): GridbotMigrationCompleteResult {
  const errors: string[] = []
  const soak = evaluateGridbotProductionSoak([
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M105_RESPONSE, at: 0 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_M114_RESPONSE, at: 1 },
    { line: DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK, at: 2 },
    { line: 'ok N42 B14 P15', at: 3 },
  ])
  if (!soak.ok) errors.push(...soak.errors.map((e) => `soak: ${e}`))

  const adv = parseGridbotAdvancedOkLine(DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK)
  const advancedOkParse = adv?.bufFree != null && adv?.plnFree != null
  if (!advancedOkParse) errors.push('ADVANCED_OK parse failed')

  const m117Marker = isGridbotM117StartLine('M117 Start') && !isGridbotM117StartLine('M117 Done')
  if (!m117Marker) errors.push('M117 Start marker failed')

  return {
    ok: errors.length === 0,
    checks: {
      productionSoakMock: soak.ok,
      advancedOkParse,
      m117Marker,
    },
    errors,
  }
}
