import type { GripBaselineParityReport } from '@/core/raster/rasterGripBaselineParity'

export type RasterParityE2eSnapshot = {
  checksumMatch: boolean
  meshMatch: boolean
  mode: string
  report: string
  updatedAt: number
}

declare global {
  interface Window {
    __shapeCamRasterParity?: RasterParityE2eSnapshot
  }
}

export function publishRasterParityE2e(report: GripBaselineParityReport | null, reportText = ''): void {
  if (typeof window === 'undefined') return
  if (!report) {
    delete window.__shapeCamRasterParity
    return
  }
  window.__shapeCamRasterParity = {
    checksumMatch: report.checksumMatch,
    meshMatch: report.meshMatch,
    mode: report.mode,
    report: reportText,
    updatedAt: Date.now(),
  }
}
