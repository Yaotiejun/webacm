#!/usr/bin/env node
/**
 * Build kiri-sla.wasm via local emcc or Docker emscripten/emsdk.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipApps = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(clipApps, '..')

const srcCandidates = [
  process.env.KIRI_SLA_C?.trim(),
  path.resolve(repoRoot, '..', 'Kiri-Moto', 'grid-apps-master', 'src', 'wasm', 'kiri-sla.c'),
  path.resolve(repoRoot, '..', 'grip', 'grid-apps-master', 'src', 'wasm', 'kiri-sla.c'),
].filter(Boolean)

const srcC = srcCandidates.find((p) => existsSync(p))
if (!srcC) {
  console.error('[build-kiri-sla-wasm] kiri-sla.c not found')
  process.exit(1)
}

const outDir = path.join(clipApps, 'public', 'wasm')
mkdirSync(outDir, { recursive: true })
const outWasm = path.join(outDir, 'kiri-sla.wasm')

function findEmcc() {
  const which = process.platform === 'win32' ? 'where' : 'which'
  const r = spawnSync(which, ['emcc'], { encoding: 'utf8' })
  if (r.status === 0) {
    return (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || null
  }
  return null
}

function dockerReady() {
  const r = spawnSync('docker', ['info'], { encoding: 'utf8' })
  return r.status === 0
}

function buildWithEmcc(emcc) {
  console.log('[build-kiri-sla-wasm] emcc:', emcc)
  const args = [
    '--no-entry', '-o', outWasm, srcC, '-O3',
    '-s', 'ERROR_ON_UNDEFINED_SYMBOLS=0',
    '-s', 'INITIAL_MEMORY=64mb',
    '-s', 'ALLOW_MEMORY_GROWTH=1',
  ]
  return spawnSync(emcc, args, { stdio: 'inherit', cwd: path.dirname(srcC) })
}

function buildWithDocker() {
  const srcDir = path.dirname(srcC).replace(/\\/g, '/')
  const outDocker = outDir.replace(/\\/g, '/')
  console.log('[build-kiri-sla-wasm] docker emscripten/emsdk:3.1.61')
  const args = [
    'run', '--rm',
    '-v', srcDir + ':/src',
    '-v', outDocker + ':/out',
    'emscripten/emsdk:3.1.61',
    'emcc', '--no-entry', '-o', '/out/kiri-sla.wasm', '/src/kiri-sla.c', '-O3',
    '-s', 'ERROR_ON_UNDEFINED_SYMBOLS=0',
    '-s', 'INITIAL_MEMORY=64mb',
    '-s', 'ALLOW_MEMORY_GROWTH=1',
  ]
  return spawnSync('docker', args, { stdio: 'inherit' })
}

let built = false
const emcc = findEmcc()
if (emcc) {
  const r = buildWithEmcc(emcc)
  built = r.status === 0
} else if (dockerReady()) {
  const r = buildWithDocker()
  built = r.status === 0
} else {
  console.error('[build-kiri-sla-wasm] no emcc and docker engine not ready')
  console.error('  Install emsdk OR start Docker Desktop, then re-run.')
  console.error('  Meanwhile product uses TS polyfill via runSlaPrepare().')
  const sync = spawnSync(process.execPath, [path.join(clipApps, 'scripts', 'sync-kiri-sla-wasm.mjs')], {
    stdio: 'inherit',
  })
  process.exit(sync.status === 0 ? 0 : 2)
}

if (!built) {
  console.error('[build-kiri-sla-wasm] build failed')
  process.exit(1)
}

const pubRoot = path.join(clipApps, 'public', 'kiri-sla.wasm')
copyFileSync(outWasm, pubRoot)
console.log('[build-kiri-sla-wasm] wrote', outWasm, '(' + statSync(outWasm).size + ' bytes)')
console.log('[build-kiri-sla-wasm] copied', pubRoot)
