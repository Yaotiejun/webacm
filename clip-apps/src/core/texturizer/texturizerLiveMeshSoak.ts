import {
  exportNonIndexedTrianglesToStlBinaryBlobAsync,
  readBinaryStlTriangleCount,
} from '@/core/texturizer/stlBinaryExport'
import { TEXTURIZER_GRIP_PARITY_STL_HEADER } from '@/core/texturizer/texturizerBinaryStlGripHash'
import { runTexturizerJob } from '@/core/texturizer/texturizerJob'
import { texturizerTriangleCountFromVertices } from '@/core/texturizer/texturizerStlVertices.node'
import { texturizerVertexZStats } from '@/core/texturizer/texturizerResultVertexStats'

export interface TexturizerLiveMeshSoakResult {
  ok: boolean
  stlPath: string
  inputTriangles: number
  outputTriangles: number
  outputVertexCount: number
  binaryStlBytes: number
  minDeltaZ: number
  maxDeltaZ: number
  errors: string[]
}

export function texturizerLiveMeshSoakEnabled(): boolean {
  return process.env.TEXTURIZER_SOAK_STL?.trim() != null || process.env.TEXTURIZER_SOAK_FORCE === '1'
}

export function texturizerLiveMeshSoakMaxTriangles(): number {
  const n = Number(process.env.TEXTURIZER_SOAK_MAX_TRIS ?? 50_000)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50_000
}

function defaultSoakTexture() {
  const width = 64
  const height = 64
  const gray = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      gray[y * width + x] = Math.round((x / (width - 1)) * 255)
    }
  }
  return { width, height, gray }
}

/** Run texturizer on a production STL and validate displaced output + binary STL export. */
export async function evaluateTexturizerLiveMeshSoak(opts: {
  vertices: Float32Array
  stlPath: string
  maxTriangles?: number
}): Promise<TexturizerLiveMeshSoakResult> {
  const errors: string[] = []
  const maxTriangles = opts.maxTriangles ?? texturizerLiveMeshSoakMaxTriangles()
  const inputTriangles = texturizerTriangleCountFromVertices(opts.vertices)

  if (inputTriangles < 1) errors.push('input mesh has no triangles')
  if (inputTriangles > maxTriangles) {
    errors.push(`input triangles ${inputTriangles} exceed TEXTURIZER_SOAK_MAX_TRIS=${maxTriangles}`)
  }

  const amplitude = Number(process.env.TEXTURIZER_SOAK_AMPLITUDE ?? 1)
  const subdiv = Number(process.env.TEXTURIZER_SOAK_SUBDIV ?? 0)

  let outputVertexCount = 0
  let outputTriangles = 0
  let binaryStlBytes = 0
  let minDeltaZ = 0
  let maxDeltaZ = 0

  if (errors.length === 0) {
    const result = runTexturizerJob({
      req: {
        vertices: opts.vertices,
        amplitude,
        frequency: 1,
        symmetricDisplacement: true,
        mappingMode: 0,
        subdivisionLevels: subdiv,
        decimationRatio: 1,
        texture: defaultSoakTexture(),
      },
      defaultCubicMode: 6,
      computeUvLegacy: (p) => ({ u: p.x, v: 0.75 - p.y * 0.5 }),
    })

    if (result.kind !== 'result') {
      errors.push(`texturizer job failed: ${result.kind}`)
    } else {
      outputVertexCount = result.summary.vertexCount
      outputTriangles = Math.floor(result.vertices.length / 9)
      const stats = texturizerVertexZStats(result.vertices, opts.vertices)
      minDeltaZ = stats.minDeltaZ
      maxDeltaZ = stats.maxDeltaZ

      if (outputTriangles < 1) errors.push('output mesh has no triangles')
      if (Math.abs(maxDeltaZ - minDeltaZ) < 1e-9) {
        errors.push('displacement range is zero (texture/amplitude ineffective)')
      }

      const blob = await exportNonIndexedTrianglesToStlBinaryBlobAsync(result.vertices, {
        headerText: TEXTURIZER_GRIP_PARITY_STL_HEADER,
      })
      const buf = await blob.arrayBuffer()
      binaryStlBytes = buf.byteLength
      const declared = readBinaryStlTriangleCount(buf)
      if (declared !== outputTriangles) {
        errors.push(`binary STL triangle count ${declared} != output ${outputTriangles}`)
      }
      if (binaryStlBytes < 84) errors.push('binary STL too small')
    }
  }

  return {
    ok: errors.length === 0,
    stlPath: opts.stlPath,
    inputTriangles,
    outputTriangles,
    outputVertexCount,
    binaryStlBytes,
    minDeltaZ,
    maxDeltaZ,
    errors,
  }
}
