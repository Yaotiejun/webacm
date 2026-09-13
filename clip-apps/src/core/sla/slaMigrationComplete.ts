/**
 * SLA product-path migration gate (offline).
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  SLA_CUBE_CTB_SHA256,
  SLA_CUBE_GOO_SHA256,
  SLA_CUBE_GOLDEN_OPTS,
  SLA_CUBE_PHOTON_SHA256,
  slaBlobStructuralDigest,
  slaGoldenCube10mm,
} from '@/core/sla/slaGoldenProfile'
import { runSlaFromMesh } from '@/core/sla/slaEngine'
import { gooFileMagicOk } from '@/core/sla/slaExportGoo'
import { SLA_BACKEND, SLA_LEGACY_INIT } from '@/core/sla/slaLegacyBridge'
import { countBundledSlaDevices } from '@/core/sla/stock/stockSlaDevices'
import { getSlaWorkerStatus, isSlaLegacyWorkPresent } from '@/core/sla/slaWorkerBridge'

export interface SlaMigrationCompleteResult {
  ok: boolean
  checks: {
    bundledDevices: boolean
    goldenPhoton: boolean
    goldenCtb: boolean
    goldenGoo: boolean
    backend: boolean
    legacyBridge: boolean
    legacyCryptoVendored: boolean
    /** Informational scaffold flag — true when status helper is wired. */
    workerScaffold: boolean
    workerRuntime: boolean
    wasmPresent: boolean
    prepareBridgePresent: boolean
    polyfillPresent: boolean
  }
  errors: string[]
}

function slaLegacyWorkDir(): string {
  return resolve(process.cwd(), 'src/core/sla/legacy/work')
}

function ctbMagicOk(blob: ArrayBuffer): boolean {
  return new DataView(blob).getUint32(0, true) === 0x12fd0086
}

function gooMagicOk(blob: ArrayBuffer): boolean {
  return gooFileMagicOk(blob)
}

export async function evaluateSlaMigrationComplete(): Promise<SlaMigrationCompleteResult> {
  const errors: string[] = []

  const bundledDevices = countBundledSlaDevices() >= 5
  if (!bundledDevices) errors.push(`bundled SLA devices < 5 (got ${countBundledSlaDevices()})`)

  let goldenPhoton = false
  try {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'photon',
    })
    const magic = new DataView(result.blob).getUint32(0, true)
    const sha = slaBlobStructuralDigest(result.blob)
    goldenPhoton =
      result.backend === 'sla-ts-mvp' && magic === 0x1900fd12 && sha === SLA_CUBE_PHOTON_SHA256
    if (!goldenPhoton) errors.push(`SLA cube photon SHA/magic mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`SLA cube photon failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  let goldenCtb = false
  try {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb',
    })
    const sha = slaBlobStructuralDigest(result.blob)
    goldenCtb = result.backend === 'sla-ts-mvp' && ctbMagicOk(result.blob) && sha === SLA_CUBE_CTB_SHA256
    if (!goldenCtb) errors.push(`SLA cube CTB SHA/magic mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`SLA cube CTB failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  let goldenGoo = false
  try {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'goo',
    })
    const sha = slaBlobStructuralDigest(result.blob)
    goldenGoo = result.backend === 'sla-ts-mvp' && gooMagicOk(result.blob) && sha === SLA_CUBE_GOO_SHA256
    if (!goldenGoo) errors.push(`SLA cube GOO SHA/magic mismatch (got ${sha})`)
  } catch (e) {
    errors.push(`SLA cube GOO failed: ${e instanceof Error ? e.message : String(e)}`)
  }

  const backend = SLA_BACKEND === 'sla-worker' || SLA_BACKEND === 'sla-ts-mvp'
  if (!backend) errors.push(`SLA_BACKEND unexpected: ${SLA_BACKEND}`)

  const legacyBridge = typeof runSlaFromMesh === 'function' && Boolean(SLA_LEGACY_INIT)
  if (!legacyBridge) errors.push('slaLegacyBridge exports missing')

  const workDir = slaLegacyWorkDir()
  const legacyCryptoVendored =
    existsSync(resolve(workDir, 'x_ctb.js')) &&
    existsSync(resolve(workDir, 'x_ctb_crypto.js')) &&
    existsSync(resolve(workDir, 'x_goo.js'))
  if (!legacyCryptoVendored) {
    errors.push('SLA legacy x_ctb.js / x_ctb_crypto.js / x_goo.js missing under legacy/work')
  }

  const workerStatus = getSlaWorkerStatus()
  const workerScaffold =
    (workerStatus.mode === 'worker-runtime' || workerStatus.mode === 'ts-mvp') &&
    typeof workerStatus.wasmPresent === 'boolean'
  const workerRuntime = workerStatus.mode === 'worker-runtime'
  const wasmPresent = workerStatus.wasmPresent === true
  const prepareBridgePresent = workerStatus.prepareBridgePresent === true
  const polyfillPresent = workerStatus.polyfillPresent === true
  if (!isSlaLegacyWorkPresent()) {
    errors.push('SLA legacy init-work.js missing (worker scaffold required)')
  }
  if (!workerRuntime) {
    errors.push('SLA worker-runtime missing (src/workers/sla.worker.ts + src/api/sla.ts)')
  }
  if (!wasmPresent) {
    errors.push('kiri-sla.wasm missing under public/wasm (run npm run sync:kiri-sla-wasm)')
  }
  if (!prepareBridgePresent) errors.push('slaPrepareBridge missing')
  if (!polyfillPresent) errors.push('slaWasmPolyfill missing')

  return {
    ok: errors.length === 0,
    checks: {
      bundledDevices,
      goldenPhoton,
      goldenCtb,
      goldenGoo,
      backend,
      legacyBridge,
      legacyCryptoVendored,
      workerScaffold,
      workerRuntime,
      wasmPresent,
      prepareBridgePresent,
      polyfillPresent,
    },
    errors,
  }
}
