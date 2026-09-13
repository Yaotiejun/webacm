/**
 * Copy grip raster-path-main benchmark STLs into clip-apps/public for dev parity.
 * Usage: node scripts/sync-grip-raster-fixtures.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveGripPackagePath } from './resolve-grip-root.mjs'

const clipRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const gripRasterRoot = resolveGripPackagePath('raster-path-main')
const gripFixtures = gripRasterRoot
  ? path.join(gripRasterRoot, 'benchmark', 'fixtures')
  : path.resolve(clipRoot, '../../grip/raster-path-main/benchmark/fixtures')
const outDir = path.join(clipRoot, 'public', 'grip-raster-fixtures')

const files = ['terrain.stl', 'tool.stl']

if (!fs.existsSync(gripFixtures)) {
  console.error(`[sync-grip-raster-fixtures] grip fixtures not found: ${gripFixtures}`)
  console.error('Set GRIP_ROOT or use Kiri-Moto/raster-path-main; or place STLs under public/grip-raster-fixtures/')
  process.exit(1)
}

fs.mkdirSync(outDir, { recursive: true })
for (const name of files) {
  const src = path.join(gripFixtures, name)
  if (!fs.existsSync(src)) {
    console.error(`[sync-grip-raster-fixtures] missing: ${src}`)
    process.exit(1)
  }
  const dest = path.join(outDir, name)
  fs.copyFileSync(src, dest)
  const stat = fs.statSync(dest)
  console.log(`[sync-grip-raster-fixtures] ${name} → ${dest} (${stat.size} bytes)`)
}
const gripPlanarBaseline = gripRasterRoot
  ? path.join(gripRasterRoot, 'test-output', 'planar-baseline.json')
  : path.resolve(clipRoot, '../../grip/raster-path-main/test-output/planar-baseline.json')
if (fs.existsSync(gripPlanarBaseline)) {
  const raw = JSON.parse(fs.readFileSync(gripPlanarBaseline, 'utf8'))
  const meta = {
    parameters: raw.parameters,
    result: {
      terrainPoints: raw.result?.terrainPoints,
      toolpathSize: raw.result?.toolpathSize,
      numScanlines: raw.result?.numScanlines,
      pointsPerLine: raw.result?.pointsPerLine,
      checksum: raw.result?.checksum,
      sampleValues: Array.isArray(raw.result?.sampleValues) ? raw.result.sampleValues.slice(0, 24) : [],
    },
  }
  const metaDest = path.join(outDir, 'planar-baseline.meta.json')
  fs.writeFileSync(metaDest, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
  console.log(`[sync-grip-raster-fixtures] planar-baseline.meta.json → ${metaDest}`)
} else {
  console.warn(`[sync-grip-raster-fixtures] skip meta (not found): ${gripPlanarBaseline}`)
}

const gripRadialBaseline = gripRasterRoot
  ? path.join(gripRasterRoot, 'test-output', 'radial-baseline.json')
  : path.resolve(clipRoot, '../../grip/raster-path-main/test-output/radial-baseline.json')
if (fs.existsSync(gripRadialBaseline)) {
  const raw = JSON.parse(fs.readFileSync(gripRadialBaseline, 'utf8'))
  const meta = {
    parameters: raw.parameters,
    result: {
      numStrips: raw.result?.numStrips,
      totalPoints: raw.result?.totalPoints,
      checksum: raw.result?.checksum,
      sampleValues: Array.isArray(raw.result?.sampleValues) ? raw.result.sampleValues.slice(0, 12) : [],
    },
  }
  const metaDest = path.join(outDir, 'radial-baseline.meta.json')
  fs.writeFileSync(metaDest, `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
  console.log(`[sync-grip-raster-fixtures] radial-baseline.meta.json → ${metaDest}`)
} else {
  console.warn(`[sync-grip-raster-fixtures] skip radial meta (not found): ${gripRadialBaseline}`)
}

console.log('[sync-grip-raster-fixtures] done — use Raster 「grip 基线 STL」 / 「基线一键」 in dev')
