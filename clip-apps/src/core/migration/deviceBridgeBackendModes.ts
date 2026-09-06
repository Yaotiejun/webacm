/**
 * device-bridge TCP backend modes surfaced on `[bridge]` log lines.
 * Source: shape_cam/device-bridge/src/main.ts
 */
export const DEVICE_BRIDGE_TCP_STATES = Object.freeze([
  'unknown',
  'connected',
  'closed',
  'error',
] as const)

export type DeviceBridgeTcpState = (typeof DEVICE_BRIDGE_TCP_STATES)[number]

export function parseDeviceBridgeTcpState(line: string): DeviceBridgeTcpState | null {
  const lower = line.toLowerCase()
  if (lower.includes('tcp connected')) return 'connected'
  if (lower.includes('tcp closed')) return 'closed'
  if (lower.includes('tcp error')) return 'error'
  return null
}

/** Host:port from `[bridge] tcp connected host:port` (device-bridge TCP backend). */
export function parseDeviceBridgeTcpEndpoint(line: string): string | null {
  const m = line.match(/tcp connected\s+(\S+:\d+)/i)
  return m?.[1] ?? null
}
