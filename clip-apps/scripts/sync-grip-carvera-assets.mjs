#!/usr/bin/env node
/**
 * Copy carve-control Carvera machine OBJ into clip-apps/public.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeCarveraMtl } from './carvera-mtl-generate.mjs'

const clipRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.resolve(clipRoot, '../../grip/carve-control-main/web/carvera.obj')
const outDir = path.join(clipRoot, 'public', 'carvera')
const dest = path.join(outDir, 'carvera.obj')

if (!fs.existsSync(src)) {
  console.error('[sync-grip-carvera-assets] missing:', src)
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
fs.copyFileSync(src, dest)
const stat = fs.statSync(dest)
const mtlDest = writeCarveraMtl(outDir)
const mtlStat = fs.statSync(mtlDest)
console.log(`[sync-grip-carvera-assets] carvera.obj → ${dest} (${stat.size} bytes)`)
console.log(`[sync-grip-carvera-assets] carvera.mtl → ${mtlDest} (${mtlStat.size} bytes, grip matcap colors)`)
