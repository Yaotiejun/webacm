#!/usr/bin/env node
/**
 * Runs offline migration product gates (vitest) and prints pass/fail per domain.
 * Usage: npm run migration:gates:report
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const r = spawnSync(
  'npx',
  ['vitest', 'run', 'src/core/migration/migrationProductGates.spec.ts', '--config', 'vitest.migration.ts'],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
)
process.exit(r.status ?? 1)
