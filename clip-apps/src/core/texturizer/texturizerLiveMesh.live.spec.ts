// @vitest-environment node
/**
 * Live texturizer soak on a real STL (production mesh or synced grip fixture).
 *
 *   npm run sync:grip-fixtures
 *   npm run soak:texturizer:live
 *
 * Custom mesh:
 *   $env:TEXTURIZER_SOAK_STL='D:\meshes\part.stl'
 *   $env:TEXTURIZER_SOAK_MAX_TRIS='200000'
 *   npm run soak:texturizer:live
 */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { evaluateTexturizerLiveMeshSoak } from '@/core/texturizer/texturizerLiveMeshSoak'
import {
  loadTexturizerSoakVerticesFromStl,
  texturizerSoakStlPath,
} from '@/core/texturizer/texturizerStlVertices.node'

const stlPath = texturizerSoakStlPath()
const SOAK_TIMEOUT_MS = Number(process.env.TEXTURIZER_SOAK_TIMEOUT_MS ?? 180_000)

describe.skipIf(!stlPath)('texturizerLiveMesh.live', () => {
  it(
    'displaces imported STL and exports valid binary STL',
    async () => {
      expect(stlPath).toBeTruthy()
      expect(existsSync(stlPath!)).toBe(true)
      const vertices = loadTexturizerSoakVerticesFromStl(stlPath!)
      const result = await evaluateTexturizerLiveMeshSoak({ vertices, stlPath: stlPath! })
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error('texturizer live soak:', result)
      }
      expect(result.ok, result.errors.join('; ')).toBe(true)
      expect(result.outputTriangles).toBeGreaterThan(0)
      expect(result.binaryStlBytes).toBeGreaterThan(84)
      expect(Math.abs(result.maxDeltaZ - result.minDeltaZ)).toBeGreaterThan(0)
    },
    SOAK_TIMEOUT_MS + 10_000,
  )
})
