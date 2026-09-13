/**
 * Laser Worker status — real Worker file + import shims.
 * Product UI uses submitLaserJob (Worker in browser; sync in vitest).
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { LASER_LEGACY_WORKER } from '@/core/laser/laserLegacyBridge'

const SHIM_MARKERS = [
  'src/core/laser/legacy/geo/base.js',
  'src/core/laser/legacy/kiri/app/pack.js',
  'src/core/laser/legacy/kiri/mode/laser/init-work.js',
] as const

const WORKER_FILE = 'src/workers/laser.worker.ts'
const API_FILE = 'src/api/laser.ts'

export type LaserWorkerStatus = {
  mode: 'ts-mvp' | 'worker-runtime' | 'legacy-pending'
  legacyPath: string
  legacyPresent: boolean
  importShimPresent: boolean
  workerFilePresent: boolean
  apiPresent: boolean
  missingDeps: string[]
}

function abs(rel: string): string {
  return resolve(process.cwd(), rel)
}

function importShimPresent(): boolean {
  return SHIM_MARKERS.every((rel) => existsSync(abs(rel)))
}

/** True when vendored init-work + geo/pack import shims are on disk. */
export function isLaserLegacyWorkerAvailable(): boolean {
  return existsSync(abs(LASER_LEGACY_WORKER)) && importShimPresent()
}

export function isLaserWorkerRuntimePresent(): boolean {
  return existsSync(abs(WORKER_FILE)) && existsSync(abs(API_FILE))
}

export function getLaserWorkerStatus(): LaserWorkerStatus {
  const legacyPresent = existsSync(abs(LASER_LEGACY_WORKER))
  const shimOk = importShimPresent()
  const workerFilePresent = existsSync(abs(WORKER_FILE))
  const apiPresent = existsSync(abs(API_FILE))
  const missingDeps: string[] = []
  if (!legacyPresent) missingDeps.push('legacy/init-work.js')
  if (!shimOk) missingDeps.push('import-path shims (geo/pack/mode)')
  if (!workerFilePresent) missingDeps.push('src/workers/laser.worker.ts')
  if (!apiPresent) missingDeps.push('src/api/laser.ts')
  // Kiri LASER.slice widget protocol (3D mesh) still optional for SVG/DXF product path
  missingDeps.push('optional: full Kiri LASER.slice widget protocol (3D mesh)')

  const mode =
    workerFilePresent && apiPresent
      ? ('worker-runtime' as const)
      : shimOk
        ? ('legacy-pending' as const)
        : ('ts-mvp' as const)

  return {
    mode,
    legacyPath: LASER_LEGACY_WORKER,
    legacyPresent,
    importShimPresent: shimOk,
    workerFilePresent,
    apiPresent,
    missingDeps,
  }
}
