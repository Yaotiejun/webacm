/** device-bridge environment variables (keep aligned with device-bridge/src/main.ts). */
export const DEVICE_BRIDGE_ENV = Object.freeze({
  PORT: 'PORT',
  CARVERA_BACKEND: 'CARVERA_BACKEND',
  CARVERA_TCP: 'CARVERA_TCP',
  GRIDBOT_BACKEND: 'GRIDBOT_BACKEND',
  GRIDBOT_TCP: 'GRIDBOT_TCP',
} as const)

export const DEVICE_BRIDGE_BACKEND_KINDS = Object.freeze(['mock', 'tcp'] as const)

/** Carvera mock command queue cap in device-bridge. */
export const DEVICE_BRIDGE_CARVERA_QUEUE_MAX = 200
