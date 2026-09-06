#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npm', ['run', 'migration:verify'])
run('npm', ['run', 'migration:gates'])
run('npm', ['run', 'migration:report'])
run('npm', ['run', 'migration:quickstart'])

if (process.env.MIGRATION_E2E_RASTER === '1') {
  run('npm', ['run', 'test:e2e:raster-baseline'])
}
