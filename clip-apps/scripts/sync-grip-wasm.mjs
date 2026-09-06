#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipApps = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(clipApps, '..')

/** grip repo often ships a 44-byte pointer file, not the binary. */
function isRealWasmFile(filePath) {
  if (!existsSync(filePath)) return false
  try {
    const st = statSync(filePath)
    if (st.size < 1024) return false
    const head = readFileSync(filePath, { encoding: null, flag: 'r' }).subarray(0, 4)
    return head[0] === 0x00 && head[1] === 0x61 && head[2] === 0x73 && head[3] === 0x6d
  } catch {
    return false
  }
}

const candidates = [
  path.join(clipApps, 'node_modules', 'manifold-3d', 'manifold.wasm'),
  path.resolve(repoRoot, '..', 'grip', 'grid-apps-master', 'src', 'wasm', 'manifold.wasm'),
  path.join(repoRoot, 'wasm', 'manifold.wasm'),
]

const srcWasm = candidates.find(isRealWasmFile)
if (!srcWasm) {
  console.error('[sync-grip-wasm] no real manifold.wasm found. Tried:')
  for (const c of candidates) console.error('  -', c)
  console.error('[sync-grip-wasm] run: cd clip-apps && npm install')
  process.exit(1)
}

const targets = [
  path.join(repoRoot, 'wasm', 'manifold.wasm'),
  path.join(clipApps, 'public', 'wasm', 'manifold.wasm'),
  path.join(clipApps, 'src', 'core', 'cam', 'legacy', 'wasm', 'manifold.wasm'),
]

for (const dest of targets) {
  mkdirSync(path.dirname(dest), { recursive: true })
  copyFileSync(srcWasm, dest)
  console.log('[sync-grip-wasm] copied →', dest, `(${statSync(dest).size} bytes)`)
}
