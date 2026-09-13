/**
 * SLA Worker / WASM / prepare status.
 */
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { SLA_LEGACY_INIT } from '@/core/sla/slaLegacyBridge'

export type SlaWorkerStatus = {
  mode: 'ts-mvp' | 'worker-runtime'
  wasmPresent: boolean
  legacyWorkPresent: boolean
  workerFilePresent: boolean
  apiPresent: boolean
  prepareBridgePresent: boolean
  polyfillPresent: boolean
  wasmPath: string
  legacyInitPath: string
  missingDeps: string[]
}

const DEFAULT_WASM_REL = 'public/wasm/kiri-sla.wasm'
const WORKER_FILE = 'src/workers/sla.worker.ts'
const API_FILE = 'src/api/sla.ts'
const PREPARE_FILE = 'src/core/sla/slaPrepareBridge.ts'
const POLYFILL_FILE = 'src/core/sla/slaWasmPolyfill.ts'

function pathIsAbs(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('/') || p.startsWith('\\')
}

function resolveWasmCandidates(): string[] {
  const envPath = process.env.SLA_KIRI_WASM_PATH?.trim()
  const rels = [envPath, DEFAULT_WASM_REL, 'public/kiri-sla.wasm', 'public/grip-wasm/kiri-sla.wasm'].filter(
    (p): p is string => Boolean(p && p.length),
  )
  return rels.map((p) => (pathIsAbs(p) ? p : resolve(process.cwd(), p)))
}

export function isSlaLegacyWorkPresent(): boolean {
  return existsSync(resolve(process.cwd(), SLA_LEGACY_INIT))
}

export function isSlaWasmPresent(): boolean {
  return resolveWasmCandidates().some((p) => existsSync(p))
}

export function isSlaWorkerRuntimePresent(): boolean {
  return existsSync(resolve(process.cwd(), WORKER_FILE)) && existsSync(resolve(process.cwd(), API_FILE))
}

export function getSlaWorkerStatus(): SlaWorkerStatus {
  const legacyWorkPresent = isSlaLegacyWorkPresent()
  const wasmPresent = isSlaWasmPresent()
  const workerFilePresent = existsSync(resolve(process.cwd(), WORKER_FILE))
  const apiPresent = existsSync(resolve(process.cwd(), API_FILE))
  const prepareBridgePresent = existsSync(resolve(process.cwd(), PREPARE_FILE))
  const polyfillPresent = existsSync(resolve(process.cwd(), POLYFILL_FILE))
  const missingDeps: string[] = []
  if (!wasmPresent) missingDeps.push('kiri-sla.wasm')
  if (!legacyWorkPresent) missingDeps.push('legacy/work/init-work.js')
  if (!workerFilePresent) missingDeps.push(WORKER_FILE)
  if (!apiPresent) missingDeps.push(API_FILE)
  if (!prepareBridgePresent) missingDeps.push(PREPARE_FILE)
  if (!polyfillPresent) missingDeps.push(POLYFILL_FILE)
  if (wasmPresent) {
    const sz = resolveWasmCandidates()
      .map((p) => (existsSync(p) ? statSync(p).size : 0))
      .reduce((a, b) => Math.max(a, b), 0)
    if (sz > 0 && sz < 1024) missingDeps.push('kiri-sla.wasm too small (<1KB, likely invalid)')
  }
  missingDeps.push('optional: shop-floor HW-09 + ChiTuBox/Elegoo open of tmp/sla-official-fixtures')

  return {
    mode: workerFilePresent && apiPresent && prepareBridgePresent ? 'worker-runtime' : 'ts-mvp',
    wasmPresent,
    legacyWorkPresent,
    workerFilePresent,
    apiPresent,
    prepareBridgePresent,
    polyfillPresent,
    wasmPath: DEFAULT_WASM_REL,
    legacyInitPath: SLA_LEGACY_INIT,
    missingDeps,
  }
}
