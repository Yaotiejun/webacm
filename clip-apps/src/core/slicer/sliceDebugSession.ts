import type { SliceTelemetryConfigSnapshot } from './sliceTelemetryConfig'
import { getSlicerDebugApi, installSlicerDebugApi, type SlicerDebugApiOptions } from './sliceDebugApi'
import { loadSlicerDebugConfig, saveSlicerDebugConfig } from './sliceDebugConfigStorage'

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export function buildSlicerDebugConfigChangeHandler(storage: StorageLike) {
  return (cfg: SliceTelemetryConfigSnapshot) => {
    try {
      saveSlicerDebugConfig(storage, cfg)
    } catch {
      // ignore storage write failure (private mode / quota)
    }
  }
}

export function restoreSlicerDebugConfigFromSession(targetWindow: Window, storage: StorageLike) {
  try {
    const raw = loadSlicerDebugConfig(storage)
    if (!raw) return null
    return getSlicerDebugApi(targetWindow)?.importConfigJson(raw) ?? null
  } catch {
    return null
  }
}

export function initSlicerDebugSession(
  targetWindow: Window,
  storage: StorageLike,
  options: Omit<SlicerDebugApiOptions, 'onConfigChange'>,
) {
  installSlicerDebugApi(targetWindow, {
    ...options,
    onConfigChange: buildSlicerDebugConfigChangeHandler(storage),
  })
  return restoreSlicerDebugConfigFromSession(targetWindow, storage)
}
