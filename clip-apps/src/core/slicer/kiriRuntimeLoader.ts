import type { LegacyFdmMode } from '@/core/slicer/kiriRuntimePolicy'
import { shouldThrowOnLegacyImportFailure, shouldTryLegacyFdm } from '@/core/slicer/kiriRuntimePolicy'
import { getKiriRuntimeState } from '@/core/slicer/kiriRuntimeState'

export interface LegacyImportBindings {
  fdmSliceImpl: any
  fakeDeviceProfile: any
  fakeControllerProfile: any
}

export interface LegacyRuntimeLoaderOptions {
  /** Test hook: replace bundled legacy import. */
  importBundle?: () => Promise<Record<string, unknown>>
  onBind: (bindings: LegacyImportBindings) => void
  onClear: () => void
  onWarn?: (msg: string) => void
}

/** grip `mode/fdm/slice.js` exports `fdm_slice`, not default/slice. */
export function resolveLegacyFdmSliceImpl(mod: Record<string, unknown>): ((...args: unknown[]) => unknown) | null {
  const fn =
    mod.fdm_slice ??
    mod.default ??
    mod.slice
  return typeof fn === 'function' ? (fn as (...args: unknown[]) => unknown) : null
}

export async function loadLegacyFdmRuntime(
  mode: LegacyFdmMode,
  _baseUrl: string,
  options: LegacyRuntimeLoaderOptions,
): Promise<void> {
  getKiriRuntimeState().lastLegacyFdmImportError = null
  if (!shouldTryLegacyFdm(mode)) return
  const warn = options.onWarn ?? (() => {})
  const loadBundle =
    options.importBundle ??
    (() => import('./kiriLegacyFdmBootstrap').then((m) => m as Record<string, unknown>))

  try {
    const bundle = await loadBundle()
    const impl = resolveLegacyFdmSliceImpl(bundle)
    if (impl) {
      options.onBind({
        fdmSliceImpl: impl,
        fakeDeviceProfile: {
          bedWidth: 200,
          bedDepth: 200,
          maxHeight: 200,
          originCenter: true,
          bedBelt: false,
          extruders: [{ extNozzle: 0.4, extFilament: 1.75 }],
        },
        fakeControllerProfile: {
          gcode: {},
          devel: false,
          assembly: false,
          threaded: false,
          healMesh: true,
          lineType: 'path',
        },
      })
    } else {
      warn('[kiriEngine] legacy fdm_slice module loaded without callable export')
      getKiriRuntimeState().lastLegacyFdmImportError = 'legacy fdm_slice module loaded without callable export'
      options.onClear()
    }
  } catch (e) {
    warn(`[kiriEngine] legacy import failed: ${(e as Error)?.message ?? String(e)}`)
    if (shouldThrowOnLegacyImportFailure(mode)) throw e
    getKiriRuntimeState().lastLegacyFdmImportError = (e as Error)?.message ?? String(e)
    options.onClear()
  }
}
