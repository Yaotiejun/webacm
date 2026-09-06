/**
 * device-bridge WebSocket surface consumed by clip-apps (migration tracking).
 * Source: shape_cam/device-bridge/src/main.ts
 */
export const DEVICE_BRIDGE_WS_PATHS = Object.freeze({
  carvera: '/carvera',
  gridbot: '/gridbot',
} as const)

export const DEVICE_BRIDGE_DEFAULT_PORT = 9999

export function deviceBridgeCarveraUrl(host = 'localhost', port = DEVICE_BRIDGE_DEFAULT_PORT): string {
  return `ws://${host}:${port}${DEVICE_BRIDGE_WS_PATHS.carvera}`
}

export function deviceBridgeGridBotUrl(host = 'localhost', port = DEVICE_BRIDGE_DEFAULT_PORT): string {
  return `ws://${host}:${port}${DEVICE_BRIDGE_WS_PATHS.gridbot}`
}
