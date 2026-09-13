/**
 * Laser product-path migration gate (offline) — kiri-ts backend.
 */
import { createHash } from 'node:crypto'
import {
  LASER_DXF_GOLDEN_DEVICE_ID,
  LASER_DXF_GOLDEN_DXF,
  LASER_DXF_GOLDEN_PROCESS,
  LASER_DXF_GOLDEN_SHA256,
  LASER_SNAPMAKER_GOLDEN_DEVICE_ID,
  LASER_SNAPMAKER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_DEVICE_ID,
  LASER_SVG_GOLDEN_PROCESS,
  LASER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_SVG,
  laserGcodeStructuralDigest,
} from '@/core/laser/laserGoldenProfile'
import { runLaserFromDxf, runLaserFromSvg } from '@/core/laser/laserEngine'
import { LASER_BACKEND, LASER_LEGACY_WORKER } from '@/core/laser/laserLegacyBridge'
import { countBundledLaserDevices } from '@/core/laser/stock/stockLaserDevices'
import {
  getLaserWorkerStatus,
  isLaserLegacyWorkerAvailable,
} from '@/core/laser/laserWorkerBridge'

export interface LaserMigrationCompleteResult {
  ok: boolean
  checks: {
    bundledDevices: boolean
    goldenSvg: boolean
    goldenDxf: boolean
    goldenSnapmaker: boolean
    backend: boolean
    legacyBridge: boolean
    workerScaffold: boolean
    importShimPresent: boolean
    workerRuntime: boolean
  }
  errors: string[]
}

function structuralSha(gcode: string): string {
  return createHash('sha256').update(laserGcodeStructuralDigest(gcode), 'utf8').digest('hex')
}

export function evaluateLaserMigrationComplete(): LaserMigrationCompleteResult {
  const errors: string[] = []

  const bundledDevices = countBundledLaserDevices() >= 4
  if (!bundledDevices) errors.push(`bundled laser devices < 4 (got ${countBundledLaserDevices()})`)

  let goldenSvg = false
  try {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    const sha = structuralSha(result.gcodeText)
    goldenSvg = result.backend === 'kiri-ts' && sha === LASER_SVG_GOLDEN_SHA256
    if (!goldenSvg) errors.push(`laser golden SVG SHA mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`laser golden SVG failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  let goldenDxf = false
  try {
    const result = runLaserFromDxf(LASER_DXF_GOLDEN_DXF, {
      deviceId: LASER_DXF_GOLDEN_DEVICE_ID,
      process: { ...LASER_DXF_GOLDEN_PROCESS },
    })
    const sha = structuralSha(result.gcodeText)
    goldenDxf = result.backend === 'kiri-ts' && sha === LASER_DXF_GOLDEN_SHA256
    if (!goldenDxf) errors.push(`laser golden DXF SHA mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`laser golden DXF failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  let goldenSnapmaker = false
  try {
    const result = runLaserFromSvg(LASER_SVG_GOLDEN_SVG, {
      deviceId: LASER_SNAPMAKER_GOLDEN_DEVICE_ID,
      process: { ...LASER_SVG_GOLDEN_PROCESS },
    })
    const sha = structuralSha(result.gcodeText)
    goldenSnapmaker =
      result.backend === 'kiri-ts' &&
      sha === LASER_SNAPMAKER_SVG_GOLDEN_SHA256 &&
      sha !== LASER_SVG_GOLDEN_SHA256 &&
      /\bM3\b/i.test(result.gcodeText)
    if (!goldenSnapmaker) errors.push(`laser golden Snapmaker SHA/M3 mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`laser golden Snapmaker failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const backend = LASER_BACKEND === 'kiri-ts'
  if (!backend) errors.push(`LASER_BACKEND unexpected: ${LASER_BACKEND}`)

  const legacyBridge = typeof runLaserFromSvg === 'function' && Boolean(LASER_LEGACY_WORKER)
  if (!legacyBridge) errors.push('laserLegacyBridge exports missing')

  const workerStatus = getLaserWorkerStatus()
  const workerScaffold =
    (workerStatus.mode === 'worker-runtime' ||
      workerStatus.mode === 'ts-mvp' ||
      workerStatus.mode === 'legacy-pending') &&
    Array.isArray(workerStatus.missingDeps)
  const importShimPresent = workerStatus.importShimPresent === true
  const workerRuntime = workerStatus.mode === 'worker-runtime' && workerStatus.workerFilePresent === true
  if (!isLaserLegacyWorkerAvailable()) {
    errors.push('laser legacy init-work.js or import shims missing (reference archive)')
  }
  if (!importShimPresent) {
    errors.push('laser importShimPresent === false')
  }
  if (!workerRuntime) {
    errors.push('laser worker-runtime missing (src/workers/laser.worker.ts + src/api/laser.ts)')
  }

  return {
    ok: errors.length === 0,
    checks: {
      bundledDevices,
      goldenSvg,
      goldenDxf,
      goldenSnapmaker,
      backend,
      legacyBridge,
      workerScaffold,
      importShimPresent,
      workerRuntime,
    },
    errors,
  }
}