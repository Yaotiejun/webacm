#!/usr/bin/env node
/**
 * Prints computed migration scoreboard (same weights as migrationProgressScoreboard.ts).
 * Run: npm run migration:report
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tsPath = resolve(__dirname, '../src/core/migration/migrationProgressScoreboard.ts')
const src = readFileSync(tsPath, 'utf8')

const rowRe =
  /\{\s*id:\s*'([^']+)',\s*label:[^,]+,\s*weightPct:\s*(\d+),\s*completionPct:\s*(\d+)/g
const rows = []
let m
while ((m = rowRe.exec(src))) {
  rows.push({ id: m[1], label: m[1], weightPct: Number(m[2]), completionPct: Number(m[3]) })
}

const PRIMARY = new Set(['texturizer', 'raster', 'cam', 'carvera', 'gridbot'])
let strictSum = 0
let primarySum = 0
let primaryWeight = 0

console.log('| Domain | Weight | Done | Contribution |')
console.log('|--------|-------:|-----:|-------------:|')
for (const row of rows) {
  const contrib = (row.weightPct * row.completionPct) / 100
  strictSum += contrib
  if (PRIMARY.has(row.id)) {
    primarySum += contrib
    primaryWeight += row.weightPct
  }
  console.log(`| ${row.id} | ${row.weightPct}% | ${row.completionPct}% | ${contrib.toFixed(2)}% |`)
}
const strict = Math.round(strictSum * 100) / 100
const primary = primaryWeight > 0 ? Math.round((primarySum / primaryWeight) * 10000) / 100 : 0
console.log('')
console.log(`Strict full-scope total: ${strict}%`)
console.log(`Primary product path: ${primary}%`)
