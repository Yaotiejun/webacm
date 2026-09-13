/**
 * Laser worker message protocol (clip-apps style, mirrors FDM slicer.worker).
 */
import type { LaserEngineProcess, LaserEngineResult } from '@/core/laser/laserEngine'
import type { LaserPolyline } from '@/core/laser/laserSvgParse'

export type LaserWorkerTask = 'slice-svg' | 'slice-dxf' | 'slice-polylines'

export type LaserWorkerRequest = {
  task: LaserWorkerTask
  deviceId?: string
  process?: LaserEngineProcess
  svgText?: string
  dxfText?: string
  polylines?: LaserPolyline[]
}

export type LaserWorkerResponse =
  | { ok: true; result: LaserEngineResult; legacyDriverLoaded: boolean }
  | { ok: false; error: string }
