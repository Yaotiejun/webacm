import {
  deviceBridgeCarveraUrl,
  deviceBridgeGridBotUrl,
} from '@/core/migration/deviceBridgeManifest'
import { resolveDeviceBridgePort } from '@/core/migration/deviceBridgePort'

export function defaultCarveraBridgeEndpoint(port = resolveDeviceBridgePort()): string {
  return deviceBridgeCarveraUrl('localhost', port)
}

export function defaultGridBotBridgeEndpoint(port = resolveDeviceBridgePort()): string {
  return deviceBridgeGridBotUrl('localhost', port)
}

export const DEFAULT_CARVERA_BRIDGE_ENDPOINT = defaultCarveraBridgeEndpoint()
export const DEFAULT_GRIDBOT_BRIDGE_ENDPOINT = defaultGridBotBridgeEndpoint()
