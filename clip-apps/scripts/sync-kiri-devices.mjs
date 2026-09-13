/**
 * Sync Kiri-Moto device JSON catalogs into clip-apps stock folders.
 *
 * Usage:
 *   node scripts/sync-kiri-devices.mjs              # FDM + CAM + laser + SLA
 *   node scripts/sync-kiri-devices.mjs --mode=fdm
 *   node scripts/sync-kiri-devices.mjs --mode=cam
 *   node scripts/sync-kiri-devices.mjs --mode=laser
 *   node scripts/sync-kiri-devices.mjs --mode=sla
 *   node scripts/sync-kiri-devices.mjs --dry-run
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { clipAppsRoot, resolveGripPackagePath } from './resolve-grip-root.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function parseArgs(argv) {
  const out = { mode: 'all', dryRun: false }
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length)
  }
  return out
}

function listJson(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => path.join(dir, f))
}

function syncDir(srcDir, destDir, dryRun) {
  if (!existsSync(srcDir)) {
    console.error(`[sync-kiri-devices] missing source: ${srcDir}`)
    return { copied: 0, skipped: 0 }
  }
  if (!dryRun) mkdirSync(destDir, { recursive: true })
  let copied = 0
  let skipped = 0
  for (const src of listJson(srcDir)) {
    const name = path.basename(src)
    const dest = path.join(destDir, name)
    if (dryRun) {
      console.log(`  would copy ${name}`)
      copied += 1
      continue
    }
    copyFileSync(src, dest)
    copied += 1
  }
  // keep dest files that are no longer in source? leave them (safer).
  void skipped
  return { copied, skipped }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const gridApps = resolveGripPackagePath('grid-apps-master')
  if (!gridApps) {
    console.error('[sync-kiri-devices] grid-apps-master not found (set GRIP_ROOT or place Kiri-Moto sibling)')
    process.exit(1)
  }

  const jobs = []
  if (args.mode === 'all' || args.mode === 'fdm') {
    jobs.push({
      label: 'FDM',
      src: path.join(gridApps, 'src/kiri/dev/fdm'),
      dest: path.join(clipAppsRoot, 'src/core/slicer/stock/fdm/devices'),
    })
  }
  if (args.mode === 'all' || args.mode === 'cam') {
    jobs.push({
      label: 'CAM',
      src: path.join(gridApps, 'src/kiri/dev/cam'),
      dest: path.join(clipAppsRoot, 'src/core/cam/stock/devices'),
    })
  }
  if (args.mode === 'all' || args.mode === 'laser') {
    jobs.push({
      label: 'laser',
      src: path.join(gridApps, 'src/kiri/dev/laser'),
      dest: path.join(clipAppsRoot, 'src/core/laser/stock/devices'),
    })
  }
  if (args.mode === 'all' || args.mode === 'sla') {
    jobs.push({
      label: 'SLA',
      src: path.join(gridApps, 'src/kiri/dev/sla'),
      dest: path.join(clipAppsRoot, 'src/core/sla/stock/devices'),
    })
  }

  console.log(`[sync-kiri-devices] grid-apps=${gridApps}${args.dryRun ? ' (dry-run)' : ''}`)
  for (const job of jobs) {
    console.log(`[sync-kiri-devices] ${job.label}: ${job.src} → ${job.dest}`)
    const { copied } = syncDir(job.src, job.dest, args.dryRun)
    console.log(`[sync-kiri-devices] ${job.label}: ${copied} json files`)
  }
}

main()
