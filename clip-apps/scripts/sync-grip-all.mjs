#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(script) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', script)], {
    cwd: root,
    stdio: 'inherit',
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('sync-grip-raster-fixtures.mjs')
run('sync-grip-carvera-assets.mjs')
run('sync-grip-wasm.mjs')
run('sync-grip-kiri-shared.mjs')
run('sync-grip-kiri-ext.mjs')
console.log('[sync-grip-all] done')
