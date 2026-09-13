/**
 * Laser Worker — TypeScript Kiri-algorithm engine off the main thread.
 */
import {
  runLaserFromDxf,
  runLaserFromPolylines,
  runLaserFromSvg,
  type LaserEngineResult,
} from '@/core/laser/laserEngine'
import type { LaserWorkerRequest, LaserWorkerResponse } from '@/core/laser/laserWorkerProtocol'

self.onmessage = (ev: MessageEvent<LaserWorkerRequest>) => {
  const msg = ev.data
  try {
    const deviceId = msg.deviceId || 'Any.Generic.Laser'
    const process = msg.process || {}
    let result: LaserEngineResult
    if (msg.task === 'slice-svg') {
      if (!msg.svgText) throw new Error('missing svgText')
      result = runLaserFromSvg(msg.svgText, { deviceId, process, backend: 'laser-worker' })
    } else if (msg.task === 'slice-dxf') {
      if (!msg.dxfText) throw new Error('missing dxfText')
      result = runLaserFromDxf(msg.dxfText, { deviceId, process, backend: 'laser-worker' })
    } else if (msg.task === 'slice-polylines') {
      if (!msg.polylines?.length) throw new Error('missing polylines')
      result = runLaserFromPolylines(msg.polylines, {
        deviceId,
        process,
        backend: 'laser-worker',
      })
    } else {
      throw new Error('unknown laser worker task')
    }
    const res: LaserWorkerResponse = { ok: true, result, legacyDriverLoaded: false }
    ;(self as DedicatedWorkerGlobalScope).postMessage(res)
  } catch (e) {
    const res: LaserWorkerResponse = {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
    ;(self as DedicatedWorkerGlobalScope).postMessage(res)
  }
}