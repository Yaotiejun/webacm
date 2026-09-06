import { DEVICE_BRIDGE_DEFAULT_PORT } from '@/core/migration/deviceBridgeManifest'

/** Resolve bridge listen port (matches device-bridge `process.env.PORT ?? 9999`). */
export function resolveDeviceBridgePort(envPort: string | undefined = undefined): number {
  const raw = envPort ?? (typeof process !== 'undefined' ? process.env?.PORT : undefined)
  if (raw == null || raw === '') return DEVICE_BRIDGE_DEFAULT_PORT
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEVICE_BRIDGE_DEFAULT_PORT
}
