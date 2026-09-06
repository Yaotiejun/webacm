import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { GripBaselineStlLoadResult } from '@/core/raster/rasterGripBaselineLoader'
import { GRIP_BASELINE_TERRAIN_VERTICES, GRIP_BASELINE_TOOL_VERTICES } from '@/core/raster/rasterGripBaselineParity'
import { stlTriangleCountFromPositionCount, stlTriangleCountFromPositions } from '@/core/raster/stlTriangleCount'

/** Resolved from `clip-apps/` cwd (`public/grip-raster-fixtures`). */
export function gripBaselineFixturesDir(): string {
  return resolve(process.cwd(), 'public/grip-raster-fixtures')
}

export function gripBaselineFixturesPresent(dir?: string): boolean {
  const base = dir ?? gripBaselineFixturesDir()
  return existsSync(resolve(base, 'terrain.stl')) && existsSync(resolve(base, 'tool.stl'))
}

function stlTrianglesFromFile(filePath: string): Float32Array {
  const buf = readFileSync(filePath)
  const geo = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const pos = geo.getAttribute('position')
  if (!pos?.array?.length) throw new Error(`empty STL: ${filePath}`)
  return pos.array instanceof Float32Array ? pos.array : new Float32Array(pos.array)
}

export function loadGripBaselineStlPairFromDisk(dir?: string): GripBaselineStlLoadResult {
  const base = dir ?? gripBaselineFixturesDir()
  const terrainTriangles = stlTrianglesFromFile(resolve(base, 'terrain.stl'))
  const toolTriangles = stlTrianglesFromFile(resolve(base, 'tool.stl'))
  const terrainVertexCount = stlTriangleCountFromPositions(terrainTriangles)
  const toolVertexCount = stlTriangleCountFromPositions(toolTriangles)
  return {
    terrainTriangles,
    toolTriangles,
    terrainVertexCount,
    toolVertexCount,
    meshMatch:
      terrainVertexCount === GRIP_BASELINE_TERRAIN_VERTICES &&
      toolVertexCount === GRIP_BASELINE_TOOL_VERTICES,
  }
}

export function stlTriangleCountFromFile(filePath: string): number {
  const buf = readFileSync(filePath)
  const geo = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  return stlTriangleCountFromPositionCount(geo.getAttribute('position').count)
}
