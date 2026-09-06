import type { SliceTelemetryConfigSnapshot } from './sliceTelemetryConfig'

export const SLICER_DEBUG_CONFIG_SESSION_KEY = 'ws-slicer-debug-config'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function saveSlicerDebugConfig(storage: StorageLike, config: SliceTelemetryConfigSnapshot) {
  storage.setItem(SLICER_DEBUG_CONFIG_SESSION_KEY, JSON.stringify(config))
}

export function loadSlicerDebugConfig(storage: StorageLike): string | null {
  return storage.getItem(SLICER_DEBUG_CONFIG_SESSION_KEY)
}
