/**
 * Carvera mock handshake lines from device-bridge (`createCarveraMockBackend`).
 * Keep aligned with shape_cam/device-bridge/src/main.ts.
 */
export const DEVICE_BRIDGE_CARVERA_MOCK_GRBL_BANNER =
  "Grbl 1.1h ['$' for help]"

/** Mock homing (`$H`) when not already alarmed. */
export const DEVICE_BRIDGE_CARVERA_MOCK_HOME_ALARM = 'ALARM:9'

/** Mock `$$` settings dump (first lines). */
export const DEVICE_BRIDGE_CARVERA_MOCK_DOLLAR_LINES = Object.freeze(['$0=10', '$1=25'] as const)

/** Mock rejects `$…` / `?…` combined tokens with Grbl error 2. */
export const DEVICE_BRIDGE_CARVERA_MOCK_SETTINGS_ERROR = 'error:2'
