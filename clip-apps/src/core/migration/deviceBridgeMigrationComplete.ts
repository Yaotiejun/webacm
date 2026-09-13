import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER,
  DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM,
  DEVICE_BRIDGE_CARVERA_MOCK_SETTINGS_ERROR,
} from '@/core/migration/deviceBridgeCarveraHandshake'
import { DEVICE_BRIDGE_CARVERA_MOCK_STATUS } from '@/core/migration/deviceBridgeCarveraMockStatus'
import { DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK } from '@/core/migration/deviceBridgeGridbotMockStatus'
import {
  formatGridbotAdvancedOk,
  parseGridbotLineNo,
} from '@/core/migration/deviceBridgeGridbotProtocol'
import { simulateCarveraMockCommand, simulateGridbotMockCommand } from '@/core/migration/deviceBridgeMockSimulator'
import {
  DEVICE_BRIDGE_DEFAULT_PORT,
  DEVICE_BRIDGE_WS_PATHS,
} from '@/core/migration/deviceBridgeManifest'
import {
  DEVICE_BRIDGE_BACKEND_KINDS,
  DEVICE_BRIDGE_ENV,
} from '@/core/migration/deviceBridgeEnvManifest'
import { parseGripTcpTarget } from '@/core/migration/deviceBridgeTcpTarget'

export interface DeviceBridgeMigrationCompleteResult {
  ok: boolean
  checks: Record<string, boolean>
  errors: string[]
}

function resolveDeviceBridgePaths(): { main: string; session: string } | null {
  const roots = [resolve(process.cwd(), '../device-bridge'), resolve(process.cwd(), 'device-bridge')]
  for (const root of roots) {
    const main = resolve(root, 'src/main.ts')
    const session = resolve(root, 'src/carvera/session.ts')
    if (existsSync(main) && existsSync(session)) return { main, session }
  }
  return null
}

/** Ensures clip-apps migration constants still appear in device-bridge source. */
export function evaluateDeviceBridgeMigrationComplete(): DeviceBridgeMigrationCompleteResult {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  checks.manifest =
    DEVICE_BRIDGE_WS_PATHS.carvera === '/carvera' &&
    DEVICE_BRIDGE_WS_PATHS.gridbot === '/gridbot' &&
    DEVICE_BRIDGE_DEFAULT_PORT === 9999
  if (!checks.manifest) errors.push('device-bridge manifest paths/port')

  checks.gridbotAdvancedOk =
    formatGridbotAdvancedOk(parseGridbotLineNo('N1 G1 X1'), 15, 15) ===
      DEVICE_BRIDGE_GRIDBOT_MOCK_ADVANCED_OK &&
    formatGridbotAdvancedOk(null, 1, 1) === 'ok B1 P1'
  if (!checks.gridbotAdvancedOk) errors.push('formatGridbotAdvancedOk drift')

  checks.tcpTarget = parseGripTcpTarget('10.0.0.1:3001')?.port === 3001
  if (!checks.tcpTarget) errors.push('parseGripTcpTarget failed')

  const carveraSim = simulateCarveraMockCommand('?', { alarmed: false })
  checks.mockSimulator =
    carveraSim.lines[0] === DEVICE_BRIDGE_CARVERA_MOCK_STATUS &&
    simulateGridbotMockCommand('G1 X1', {
      nozzleTarget: 210,
      bedTarget: 60,
      bufFree: 16,
      plnFree: 16,
    }).lines[0] === 'ok B15 P15'
  if (!checks.mockSimulator) errors.push('device-bridge mock simulator drift')

  const paths = resolveDeviceBridgePaths()
  if (!paths) {
    checks.sourceSync = false
    errors.push('device-bridge src/main.ts or carvera/session.ts not found')
  } else {
    const src = [readFileSync(paths.main, 'utf8'), readFileSync(paths.session, 'utf8')].join('\n')
    checks.sourceSync =
      src.includes(DEVICE_BRIDGE_CARVERA_MOCK_STATUS) &&
      src.includes(DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER) &&
      src.includes(DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM) &&
      src.includes(DEVICE_BRIDGE_CARVERA_MOCK_SETTINGS_ERROR) &&
      src.includes('M114') && src.includes('toFixed(2)') &&
      src.includes('ok T:') &&
      src.includes('formatGridbotAdvancedOk') &&
      src.includes(DEVICE_BRIDGE_ENV.CARVERA_BACKEND) &&
      src.includes(DEVICE_BRIDGE_ENV.GRIDBOT_TCP) &&
      src.includes('createCarveraMockSession') &&
      DEVICE_BRIDGE_BACKEND_KINDS.every((k) => src.includes("'" + k + "'") || src.includes('"' + k + '"'))
    if (!checks.sourceSync) errors.push('device-bridge main.ts/session.ts contract drift')
  }

  return { ok: errors.length === 0, checks, errors }
}
