import '@/core/cam/legacy/kiri/add/array.js'
import '@/core/cam/legacy/kiri/add/class.js'
import '@/core/cam/legacy/kiri/add/three.js'

/** Resolve legacy CAM module URL for dynamic `import()` (Vite dev + Vitest + Node). */
function legacyCamModuleHref(relativeToCamCore: string): string {
  return new URL(relativeToCamCore, import.meta.url).href
}

// Kiri CAM 运行时占位骨架
// 后续会从 F:\\3d\\chip\\grip\\grid-apps-master 中引入 Kiri CAM JS 到 legacy 目录，
// 再在这里做 TS 封装，向外暴露统一的 CAM 接口。

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

/** Set when dynamic `import()` of slice/export fails in `auto` mode (otherwise swallowed). */
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
          const camSliceUrl = legacyCamModuleHref('legacy/kiri/mode/cam/slice.js')
          const camExportUrl = legacyCamModuleHref('legacy/kiri/mode/cam/export.js')

          try {
            const [sliceMod, exportMod] = await Promise.all([
              import(/* @vite-ignore */ camSliceUrl),
              import(/* @vite-ignore */ camExportUrl),
            ])

            const sliceFn = (sliceMod as any).cam_slice ?? (sliceMod as any).default
            const exportFn = (exportMod as any).cam_export ?? (exportMod as any).default

            camSliceImpl = typeof sliceFn === 'function' ? sliceFn : null
            camExportImpl = typeof exportFn === 'function' ? exportFn : null
            lastLegacyCamImportError = null
          } catch (e) {
            lastLegacyCamImportError = e as Error
            // strict mode: treat missing/failed legacy CAM as runtime init failure
            if (legacyCamMode === '1') throw e
            // auto mode: keep runtime alive and allow placeholder engine fallback
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
