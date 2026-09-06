// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  type GripPlanarBaselineMetaFile,
  validateGripPlanarBaselineMeta,
} from './rasterGripBaselineMeta'

const metaPath = resolve(
  fileURLToPath(new URL('../../../public/grip-raster-fixtures/planar-baseline.meta.json', import.meta.url)),
)
const metaPresent = existsSync(metaPath)

describe('rasterGripBaselineMeta', () => {
  it.skipIf(!metaPresent)('synced planar-baseline.meta.json matches embedded expectations', () => {
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as GripPlanarBaselineMetaFile
    const issues = validateGripPlanarBaselineMeta(meta)
    expect(issues).toEqual([])
    expect(meta.result.sampleValues?.length).toBeGreaterThan(10)
  })
})
