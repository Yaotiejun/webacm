#!/usr/bin/env node
/**
 * Write carvera.mtl next to synced OBJ (grip carve-control matcap colors).
 * Keep mesh hex values in sync with src/core/devices/carveraGripMeshColors.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clipRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const colorsPath = path.join(clipRoot, 'src/core/devices/carveraGripMeshColors.json')
const transparent = new Set(['corner', 'fourth'])
const transparentOpacity = 0.4

function hexToKd(hex) {
  const n = parseInt(hex.replace(/^#/, ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function buildMtl(colors) {
  const lines = ['# Generated from grip carve-control canvas.js mesh colors']
  for (const [name, hex] of Object.entries(colors)) {
    const [r, g, b] = hexToKd(hex)
    const kd = `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`
    const d = transparent.has(name) ? transparentOpacity : 1
    lines.push(`newmtl ${name}`, `Ka 0.2000 0.2000 0.2000`, `Kd ${kd}`, 'Ks 0.0000 0.0000 0.0000', `d ${d}`, '')
  }
  return `${lines.join('\n')}\n`
}

export function writeCarveraMtl(destDir) {
  const colors = JSON.parse(fs.readFileSync(colorsPath, 'utf8'))
  const dest = path.join(destDir, 'carvera.mtl')
  fs.writeFileSync(dest, buildMtl(colors), 'utf8')
  return dest
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] || path.join(clipRoot, 'public', 'carvera')
  const dest = writeCarveraMtl(outDir)
  console.log(`[carvera-mtl-generate] → ${dest}`)
}
