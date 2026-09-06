import {
  DEFAULT_CARVERA_BRIDGE_ENDPOINT,
  DEFAULT_GRIDBOT_BRIDGE_ENDPOINT,
} from '@/core/migration/deviceBridgeDefaultEndpoint'

export type DeviceBridgeKind = 'carvera' | 'gridbot'

export function defaultDeviceBridgeEndpoint(kind: DeviceBridgeKind): string {
  return kind === 'carvera' ? DEFAULT_CARVERA_BRIDGE_ENDPOINT : DEFAULT_GRIDBOT_BRIDGE_ENDPOINT
}
