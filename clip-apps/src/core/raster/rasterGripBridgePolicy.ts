import type { RasterMode } from '@/types/raster'

const SESSION_KEY = 'ws-raster-grip-bridge'

/** Dev UI override (session); `null` = follow env. */
export function getRasterGripBridgeSessionOverride(): boolean | null {
  if (typeof sessionStorage === 'undefined') return null
  const v = sessionStorage.getItem(SESSION_KEY)
  if (v === '1') return true
  if (v === '0') return false
  return null
}

export function setRasterGripBridgeSessionOverride(on: boolean | null): void {
  if (typeof sessionStorage === 'undefined') return
  if (on === null) sessionStorage.removeItem(SESSION_KEY)
  else sessionStorage.setItem(SESSION_KEY, on ? '1' : '0')
}

/** When true, planar/radial jobs use grip `raster-path-main` via dedicated worker. */
export function isRasterGripBridgeEnabled(): boolean {
  const session = getRasterGripBridgeSessionOverride()
  if (session !== null) return session
  return String(import.meta.env.VITE_RASTER_GRIP_BRIDGE ?? '0') === '1'
}

export function rasterModeSupportedByGripBridge(mode: RasterMode): boolean {
  return mode === 'planar' || mode === 'radial'
}

export function shouldRunRasterViaGripBridge(mode: RasterMode): boolean {
  return isRasterGripBridgeEnabled() && rasterModeSupportedByGripBridge(mode)
}
