// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import {
  GRIP_BASELINE_TERRAIN_VERTICES,
  GRIP_BASELINE_TOOL_VERTICES,
  matchesGripBaselineMesh,
} from '@/core/raster/rasterGripBaselineParity'
import { stlTriangleCountFromPositionCount } from '@/core/raster/stlTriangleCount'

const fixturesDir = resolve(
  fileURLToPath(new URL('../../../public/grip-raster-fixtures', import.meta.url)),
)
const terrainPath = resolve(fixturesDir, 'terrain.stl')
const toolPath = resolve(fixturesDir, 'tool.stl')
const fixturesPresent = existsSync(terrainPath) && existsSync(toolPath)

function stlGripTriangleCount(filePath: string): number {
  const buf = readFileSync(filePath)
  const geo = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  return stlTriangleCountFromPositionCount(geo.getAttribute('position').count)
}

describe('rasterGripBaselineLoader.integration', () => {
  it.skipIf(!fixturesPresent)(
    'synced public/grip-raster-fixtures STL pair matches grip planar-baseline mesh sizes',
    () => {
      const terrainVertexCount = stlGripTriangleCount(terrainPath)
      const toolVertexCount = stlGripTriangleCount(toolPath)
      expect(terrainVertexCount).toBe(GRIP_BASELINE_TERRAIN_VERTICES)
      expect(toolVertexCount).toBe(GRIP_BASELINE_TOOL_VERTICES)
      expect(matchesGripBaselineMesh(terrainVertexCount, toolVertexCount)).toBe(true)
    },
  )
})
