import { getKiriCamImpls, kiriCamRuntime } from '@/core/cam/kiriCamRuntime'
import { runCamJob } from '@/core/cam/camEngine'
import { buildCamCaptureGeometry, buildCamCaptureProfile } from '@/core/cam/camCaptureProfile'
import { compareLegacyCamExportToGripCapture } from '@/core/cam/camLegacyExportStream'

export function isCamLegacyExportAvailable(): boolean {
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  return typeof camSliceImpl === 'function' && typeof camExportImpl === 'function'
}

/** Live `cam_slice` → `cam_export` vs bundled grip capture (requires legacy CAM bundle). */
export async function runCamLiveExportGripParity(): Promise<{
  ok: boolean
  compare: Awaited<ReturnType<typeof compareLegacyCamExportToGripCapture>> | null
  errors: string[]
}> {
  await kiriCamRuntime.init()
  if (!isCamLegacyExportAvailable()) {
    return {
      ok: false,
      compare: null,
      errors: ['legacy cam_slice/cam_export not loaded'],
    }
  }

  const result = await runCamJob(buildCamCaptureProfile(), buildCamCaptureGeometry())
  const compare = await compareLegacyCamExportToGripCapture(result)
  const errors: string[] = []
  if (result.backend !== 'kiri-cam') errors.push(`backend=${result.backend}`)
  if (!compare.ok) errors.push(compare.detail)

  return { ok: errors.length === 0, compare, errors }
}
