import { describe, expect, it } from 'vitest'
import { getKiriCamImpls, getKiriCamLegacyHealth } from './kiriCamRuntime'

describe('getKiriCamLegacyHealth', () => {
  it('returns a stable snapshot shape', () => {
    const h = getKiriCamLegacyHealth()
    expect(Object.keys(h).sort()).toEqual(
      ['hasExport', 'hasSlice', 'initErrorMessage', 'legacyImportErrorMessage', 'ready'].sort(),
    )
    expect(typeof h.ready).toBe('boolean')
    expect(typeof h.hasSlice).toBe('boolean')
    expect(typeof h.hasExport).toBe('boolean')
    expect(h.initErrorMessage === null || typeof h.initErrorMessage === 'string').toBe(true)
    expect(h.legacyImportErrorMessage === null || typeof h.legacyImportErrorMessage === 'string').toBe(true)
  })

  it('getKiriCamImpls exposes stable keys and null-or-function slots', () => {
    const impl = getKiriCamImpls()
    expect(Object.keys(impl).sort()).toEqual(['camExportImpl', 'camSliceImpl'])
    expect(impl.camSliceImpl === null || typeof impl.camSliceImpl === 'function').toBe(true)
    expect(impl.camExportImpl === null || typeof impl.camExportImpl === 'function').toBe(true)
  })
})
