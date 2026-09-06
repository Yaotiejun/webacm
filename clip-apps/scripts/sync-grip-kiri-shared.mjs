#!/usr/bin/env node
/**
 * Sync grip grid-apps shared modules required by FDM legacy (kiri/core/utils.js):
 *   ../../moto/*  -> src/core/slicer/legacy/moto/
 *   ../../data/*  -> src/core/slicer/legacy/data/
 *
 * Usage: npm run sync:grip-kiri-shared
 */
import { cpSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipApps = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gripSrc = path.resolve(clipApps, '..', '..', 'grip', 'grid-apps-master', 'src')
const legacyRoot = path.join(clipApps, 'src', 'core', 'slicer', 'legacy')

const copies = [
  { name: 'moto', src: path.join(gripSrc, 'moto'), dest: path.join(legacyRoot, 'moto') },
  { name: 'data', src: path.join(gripSrc, 'data'), dest: path.join(legacyRoot, 'data') },
]

if (!existsSync(gripSrc)) {
  console.error('[sync-grip-kiri-shared] grip source not found:', gripSrc)
  process.exit(1)
}

for (const { name, src, dest } of copies) {
  if (!existsSync(src)) {
    console.error(`[sync-grip-kiri-shared] missing: ${src}`)
    process.exit(1)
  }
  cpSync(src, dest, { recursive: true, force: true })
  console.log(`[sync-grip-kiri-shared] ${name} → ${dest}`)
}

console.log('[sync-grip-kiri-shared] done — FDM legacy utils.js can resolve moto/ajax.js and data/local.js')
