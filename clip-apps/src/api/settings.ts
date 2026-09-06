import type { AppSettings, ControllerSettings } from '@/types/settings'

const STORAGE_KEY = 'ws-settings'

function isPlainSettingsRoot(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function controllerMergePatch(value: unknown): Partial<ControllerSettings> {
  if (!isPlainSettingsRoot(value)) return {}
  return value as Partial<ControllerSettings>
}

const defaultSettings: AppSettings = {
  controller: {
    animesh: '800',
    antiAlias: true,
    assembly: false,
    autoLayout: true,
    autoSave: true,
    dark: false,
    detail: '50',
    devel: false,
    drawer: false,
    edgeangle: 20,
    exportOcto: false,
    exportPreview: false,
    exportThumb: false,
    freeLayout: true,
    healMesh: false,
    lineType: 'path',
    manifold: false,
    ortho: false,
    reverseZoom: true,
    scrolls: true,
    shiny: true,
    showOrigin: false,
    showRulers: true,
    showSpeeds: true,
    spaceLayout: 1,
    spaceRandoX: false,
    threaded: true,
    units: 'mm',
    view: null,
    webGPU: false,
    zoomSpeed: 1.0,
  },
}

export async function getSettings(): Promise<AppSettings> {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return defaultSettings
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainSettingsRoot(parsed)) {
      return defaultSettings
    }

    return {
      ...defaultSettings,
      controller: {
        ...defaultSettings.controller,
        ...controllerMergePatch(parsed.controller),
      },
    }
  } catch {
    return defaultSettings
  }
}

export async function saveSettings(payload: AppSettings): Promise<void> {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}
