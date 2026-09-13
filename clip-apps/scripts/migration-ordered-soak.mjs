#!/usr/bin/env node
/**
 * Ordered migration soak (user priority):
 *   1. CAM live export
 *   2. Device production soak
 *   3. FDM legacy comparison
 *   4. Raster E2E baseline
 *
 * Offline gates always run. Live steps need env flags (see SOAK.md).
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function skip(name, hint) {
  console.log(`\n[skip] ${name} — ${hint}`)
}

console.log('=== migration ordered soak: offline gates ===')
run('npm', ['run', 'migration:gates'])
run('npx', [
  'vitest',
  'run',
  'src/core/migration/migrationOrderedPipeline.spec.ts',
  'src/core/cam/camLiveExportMigration.spec.ts',
  'src/core/devices/deviceProductionSoakMigration.spec.ts',
  'src/core/slicer/fdmLegacyMigrationComplete.spec.ts',
  'src/core/raster/rasterE2eMigrationComplete.spec.ts',
  '--config',
  'vitest.migration.ts',
])

console.log('\n=== Phase 1: CAM live export ===')
if (process.env.CAM_LIVE_MIGRATION === '1') {
  run('npm', ['run', 'soak:cam:live'])
} else {
  skip('CAM live', 'set CAM_LIVE_MIGRATION=1 and VITE_KIRI_LEGACY_CAM=1')
}

console.log('\n=== Phase 2: Device production soak ===')
if (process.env.DEVICE_PRODUCTION_SOAK === '1') {
  if (process.env.CARVERA_SOAK_WS) run('npm', ['run', 'soak:carvera'])
  else skip('carvera live', 'set CARVERA_SOAK_WS=ws://localhost:9999/carvera')
  if (process.env.GRIDBOT_SOAK_WS) run('npm', ['run', 'soak:gridbot'])
  else skip('gridbot live', 'set GRIDBOT_SOAK_WS=ws://localhost:9999/gridbot')
} else {
  skip('device soak', 'set DEVICE_PRODUCTION_SOAK=1 (+ bridge URLs)')
}

console.log('\n=== Phase 3: FDM legacy ===')
if (process.env.FDM_LIVE_MIGRATION === '1') {
  run('npm', ['run', 'soak:fdm:live'])
} else {
  console.log('(offline fdmLegacyMigrationComplete passed above; set FDM_LIVE_MIGRATION=1 for live)')
}

if (process.env.DEVICE_BRIDGE_MOCK_SOAK === '1') {
  console.log('\n=== Phase 2b: device-bridge mock WS soak ===')
  run('npm', ['run', 'soak:device-bridge:mock'])
}

console.log('\n=== Phase 4: Raster E2E baseline ===')
if (process.env.E2E_RASTER_BASELINE === '1') {
  run('npm', ['run', 'check:raster-baseline'])
  run('npm', ['run', 'test:e2e:raster-baseline'])
} else {
  skip('raster E2E', 'set E2E_RASTER_BASELINE=1 (sync fixtures first)')
}

console.log('\n=== Phase 5: Laser golden soak (offline) ===')
run('npm', ['run', 'soak:laser'])

console.log('\n=== Phase 6: SLA golden soak (offline) ===')
run('npm', ['run', 'soak:sla'])

console.log('\n=== migration ordered soak complete ===')
