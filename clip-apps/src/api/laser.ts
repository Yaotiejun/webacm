/**
 * Laser job API - prefers dedicated Worker; sync fallback for Node/vitest.
 * Always clones polylines/process before postMessage (Vue Proxy cannot be cloned).
 */
import {
  cloneLaserPolylines,
  runLaserFromDxf,
  runLaserFromPolylines,
  runLaserFromSvg,
  type LaserEngineProcess,
  type LaserEngineResult,
} from '@/core/laser/laserEngine'
import type { LaserPolyline } from '@/core/laser/laserSvgParse'
import type { LaserWorkerRequest, LaserWorkerResponse } from '@/core/laser/laserWorkerProtocol'

const LaserWorkerURL = new URL('../workers/laser.worker.ts', import.meta.url)

export type LaserJobInput =
  | { kind: 'svg'; svgText: string }
  | { kind: 'dxf'; dxfText: string }
  | { kind: 'polylines'; polylines: LaserPolyline[] }

export type LaserJobOpts = {
  deviceId?: string
  process?: LaserEngineProcess
  forceSync?: boolean
}

function canUseWorker(forceSync?: boolean): boolean {
  if (forceSync) return false
  if (typeof Worker === 'undefined') return false
  if (typeof process !== 'undefined' && process.env?.VITEST) return false
  return true
}

function cloneProcess(process?: LaserEngineProcess): LaserEngineProcess | undefined {
  if (!process) return undefined
  return {
    feedrate: process.feedrate,
    seekrate: process.seekrate,
    power: process.power,
    kerf: process.kerf,
    passes: process.passes,
    nestGap: process.nestGap,
    grouped: process.grouped,
    layoutPack: process.layoutPack,
    origin: process.origin,
    engraveScan: process.engraveScan,
  }
}

function runSync(input: LaserJobInput, opts: LaserJobOpts): LaserEngineResult {
  const common = {
    deviceId: opts.deviceId,
    process: cloneProcess(opts.process),
    backend: 'kiri-ts' as const,
  }
  if (input.kind === 'svg') return runLaserFromSvg(input.svgText, common)
  if (input.kind === 'dxf') return runLaserFromDxf(input.dxfText, common)
  return runLaserFromPolylines(cloneLaserPolylines(input.polylines), common)
}

function toRequest(input: LaserJobInput, opts: LaserJobOpts): LaserWorkerRequest {
  const base = { deviceId: opts.deviceId, process: cloneProcess(opts.process) }
  if (input.kind === 'svg') return { ...base, task: 'slice-svg', svgText: String(input.svgText ?? '') }
  if (input.kind === 'dxf') return { ...base, task: 'slice-dxf', dxfText: String(input.dxfText ?? '') }
  return {
    ...base,
    task: 'slice-polylines',
    polylines: cloneLaserPolylines(input.polylines),
  }
}

export async function submitLaserJob(
  input: LaserJobInput,
  opts: LaserJobOpts = {},
): Promise<LaserEngineResult> {
  // Large scanline jobs: sync is faster than cloning megabytes into a Worker.
  const polyCount = input.kind === 'polylines' ? input.polylines.length : 0
  const forceSync = opts.forceSync || (input.kind === 'polylines' && polyCount > 8000)

  if (!canUseWorker(forceSync)) {
    return runSync(input, opts)
  }

  const worker = new Worker(LaserWorkerURL, { type: 'module' })
  const request = toRequest(input, opts)

  return new Promise<LaserEngineResult>((resolve, reject) => {
    worker.onmessage = (ev: MessageEvent<LaserWorkerResponse>) => {
      worker.terminate()
      const data = ev.data
      if (data.ok) resolve(data.result)
      else reject(new Error(data.error || 'laser worker error'))
    }
    worker.onerror = (err) => {
      worker.terminate()
      reject(err instanceof Error ? err : new Error(String(err)))
    }
    worker.onmessageerror = () => {
      worker.terminate()
      reject(new Error('laser worker message error'))
    }
    try {
      worker.postMessage(request)
    } catch (e) {
      worker.terminate()
      // Fallback if something still isn't cloneable
      try {
        resolve(runSync(input, opts))
      } catch (e2) {
        reject(e instanceof Error ? e : e2 instanceof Error ? e2 : new Error(String(e)))
      }
    }
  })
}