import { kiriCamRuntime } from '@/core/cam/kiriCamRuntime'
import { preloadKiriFdmRuntime } from '@/core/slicer/kiriEngine'

/**
 * Fire-and-forget legacy bundle load at app boot so first CAM/FDM job avoids cold import latency.
 */
export function preloadLegacyRuntimes(): void {
  const tasks: Promise<void>[] = []
  const camMode = String(import.meta.env.VITE_KIRI_LEGACY_CAM ?? 'auto')
  if (camMode !== '0') tasks.push(kiriCamRuntime.init())
  const fdmMode = String(import.meta.env.VITE_KIRI_LEGACY_FDM ?? 'auto')
  if (fdmMode !== '0') tasks.push(preloadKiriFdmRuntime())
  if (tasks.length) void Promise.all(tasks)
}
