// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { type GripRadialBaselineMetaFile, validateGripRadialBaselineMeta } from './rasterGripBaselineMeta'

const metaPath = resolve(
  fileURLToPath(new URL('../../../public/grip-raster-fixtures/radial-baseline.meta.json', import.meta.url)),
)
const metaPresent = existsSync(metaPath)

describe('rasterGripRadialBaselineMeta', () => {
  it.skipIf(!metaPresent)('synced radial-baseline.meta.json matches expectations', () => {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as GripRadialBaselineMetaFile
    expect(validateGripRadialBaselineMeta(meta)).toEqual([])
  })
})
