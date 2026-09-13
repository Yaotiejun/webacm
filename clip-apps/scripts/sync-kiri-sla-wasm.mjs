#!/usr/bin/env node
/**
 * Sync kiri-sla.wasm from Kiri-Moto / env into clip-apps public/.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipApps = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(clipApps, '..')

function isRealWasmFile(filePath) {
  if (!existsSync(filePath)) return false
  try {
    const st = statSync(filePath)
    if (st.size < 256) return false
    const head = readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, 4)
    return head[0] === 0x00 && head[1] === 0x61 && head[2] === 0x73 && head[3] === 0x6d
  } catch {
    return false
  }
}

const envPath = process.env.SLA_KIRI_WASM_PATH?.trim()
const candidates = [
  envPath,
  path.resolve(repoRoot, '..', 'Kiri-Moto', 'grid-apps-master', 'src', 'wasm', 'kiri-sla.wasm'),
  path.resolve(repoRoot, '..', 'grip', 'grid-apps-master', 'src', 'wasm', 'kiri-sla.wasm'),
  path.join(clipApps, 'public', 'wasm', 'kiri-sla.wasm'),
].filter(Boolean)

const srcWasm = candidates.find(isRealWasmFile)
if (!srcWasm) {
  console.error('[sync-kiri-sla-wasm] no kiri-sla.wasm found. Tried:')
  for (const c of candidates) console.error('  -', c)
  console.error('[sync-kiri-sla-wasm] build with emcc from Kiri-Moto src/wasm/kiri-sla.c or set SLA_KIRI_WASM_PATH')
  process.exit(1)
}

const targets = [
  path.join(clipApps, 'public', 'wasm', 'kiri-sla.wasm'),
  path.join(clipApps, 'public', 'kiri-sla.wasm'),
]

for (const dest of targets) {
  mkdirSync(path.dirname(dest), { recursive: true })
  if (path.resolve(srcWasm) === path.resolve(dest)) {
    console.log('[sync-kiri-sla-wasm] already at', dest, `(${statSync(dest).size} bytes)`)
    continue
  }
  copyFileSync(srcWasm, dest)
  console.log('[sync-kiri-sla-wasm] copied →', dest, `(${statSync(dest).size} bytes)`)
}
