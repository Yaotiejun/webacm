#!/usr/bin/env node
/**
 * Materialize grip ext stubs (earcut pointer file) for non-Vite raw imports.
 * Usage: npm run sync:grip-kiri-ext
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipApps = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const legacyExt = path.join(clipApps, 'src', 'core', 'slicer', 'legacy', 'ext')
const earcutSrc = path.join(clipApps, 'node_modules', 'earcut', 'src', 'earcut.js')
const earcutDest = path.join(legacyExt, 'earcut.js')

if (!existsSync(earcutSrc)) {
  console.error('[sync-grip-kiri-ext] missing:', earcutSrc)
  console.error('[sync-grip-kiri-ext] run: cd clip-apps && npm install')
  process.exit(1)
}

mkdirSync(legacyExt, { recursive: true })
copyFileSync(earcutSrc, earcutDest)
console.log('[sync-grip-kiri-ext] earcut.js →', earcutDest, `(${statSync(earcutDest).size} bytes)`)
