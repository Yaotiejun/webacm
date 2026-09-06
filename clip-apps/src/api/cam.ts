import type { CamProfile, CamJobInputGeometry, CamJobResult } from '@/types/camJob'
import { runCamJob, type CamEngineOptions } from '@/core/cam/camEngine'

export { runCamJob, type CamEngineOptions }

/** @deprecated Use `runCamJob` — legacy Kiri pipeline entry. */
export async function simulateCamJob(
  profile: CamProfile,
  geometry: CamJobInputGeometry,
  options?: CamEngineOptions,
): Promise<CamJobResult> {
  return runCamJob(profile, geometry, { devMode: import.meta.env.DEV, ...options })
}
