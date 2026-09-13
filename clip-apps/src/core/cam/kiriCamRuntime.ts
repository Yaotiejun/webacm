import '@/core/cam/legacy/kiri/add/array.js'
import '@/core/cam/legacy/kiri/add/class.js'
import '@/core/cam/legacy/kiri/add/three.js'

// Kiri CAM runtime — slice/export loaded via static Vite bundle (see kiriCamLegacyBootstrap).

export interface KiriCamRuntime {
  init(): Promise<void>
  isReady(): boolean
  getError(): Error | null
}

let camReady = false
let camInitError: Error | null = null
let camInitPromise: Promise<void> | null = null

let camSliceImpl: ((settings: any, widget: any, onupdate: Function, ondone: Function) => Promise<void>) | null = null
let camExportImpl: ((print: any, online: (chunk: any) => void) => any) | null = null

/** Set when bootstrap import of slice/export fails in `auto` mode (otherwise swallowed). */
let lastLegacyCamImportError: Error | null = null

export function getKiriCamImpls() {
  return { camSliceImpl, camExportImpl }
}

/** Snapshot for UI / migration debugging (after `init()`, reflects loaded legacy modules). */
export function getKiriCamLegacyHealth(): {
  ready: boolean
  initErrorMessage: string | null
  hasSlice: boolean
  hasExport: boolean
  legacyImportErrorMessage: string | null
} {
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  return {
    ready: camReady,
    initErrorMessage: camInitError?.message ?? null,
    hasSlice: typeof camSliceImpl === 'function',
    hasExport: typeof camExportImpl === 'function',
    legacyImportErrorMessage: lastLegacyCamImportError?.message ?? null,
  }
}

export const kiriCamRuntime: KiriCamRuntime = {
  async init() {
    if (camReady || camInitError) return
    if (camInitPromise) return camInitPromise

    camInitPromise = (async () => {
      try {
        const legacyCamMode = String(import.meta.env.VITE_KIRI_LEGACY_CAM ?? 'auto')
        const shouldTryLegacyCam = legacyCamMode !== '0'
        if (shouldTryLegacyCam) {
          lastLegacyCamImportError = null
          try {
            // Static import path so Vite emits slice/export into the production bundle.
            const boot = await import('@/core/cam/kiriCamLegacyBootstrap')
            const sliceFn = boot.cam_slice
            const exportFn = boot.cam_export
            camSliceImpl = typeof sliceFn === 'function' ? sliceFn : null
            camExportImpl = typeof exportFn === 'function' ? exportFn : null
            if (!camSliceImpl || !camExportImpl) {
              throw new Error('kiriCamLegacyBootstrap missing cam_slice and/or cam_export')
            }
            lastLegacyCamImportError = null
          } catch (e) {
            lastLegacyCamImportError = e as Error
            if (legacyCamMode === '1') throw e
            camSliceImpl = null
            camExportImpl = null
          }
        } else {
          lastLegacyCamImportError = null
        }

        camReady = true
        camInitError = null
      } catch (e) {
        camInitError = e as Error
        // eslint-disable-next-line no-console
        console.error('[kiriCamRuntime] runtime init failed', e)
      }
    })()

    return camInitPromise
  },
  isReady() {
    return camReady
  },
  getError() {
    return camInitError
  },
}

export function __debugKiriCamRuntimeStatus() {
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  // eslint-disable-next-line no-console
  console.debug('[kiriCamRuntime] runtime', {
    ready: camReady,
    initError: camInitError?.message,
    legacyCamSlice: typeof camSliceImpl === 'function',
    legacyCamExport: typeof camExportImpl === 'function',
    legacyImportError: lastLegacyCamImportError?.message,
  })
}
