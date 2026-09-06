import { getKiriCamImpls, getKiriCamLegacyHealth, kiriCamRuntime } from '@/core/cam/kiriCamRuntime'

export interface CamLegacyBundleProbeResult {
  available: boolean
  health: ReturnType<typeof getKiriCamLegacyHealth>
  detail: string
}

/** Probe whether legacy CAM bundle loaded (no slice/export run). */
export async function probeCamLegacyBundle(): Promise<CamLegacyBundleProbeResult> {
  await kiriCamRuntime.init()
  const health = getKiriCamLegacyHealth()
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  const available =
    typeof camSliceImpl === 'function' && typeof camExportImpl === 'function' && health.ready
  const detail = available
    ? 'legacy cam_slice + cam_export loaded'
    : [
        `ready=${health.ready}`,
        health.initErrorMessage ? `init=${health.initErrorMessage}` : '',
        health.legacyImportErrorMessage ? `import=${health.legacyImportErrorMessage}` : '',
      ]
        .filter(Boolean)
        .join('; ')
  return { available, health, detail }
}
