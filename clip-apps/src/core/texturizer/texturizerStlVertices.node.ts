import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

/** Default live-soak mesh: grip planar `tool.stl` (small, from `npm run sync:grip-fixtures`). */
export function texturizerSoakStlPath(): string | null {
  const fromEnv = process.env.TEXTURIZER_SOAK_STL?.trim()
  if (fromEnv) {
    const abs = resolve(fromEnv)
    return existsSync(abs) ? abs : null
  }
  const fallback = resolve(process.cwd(), 'public/grip-raster-fixtures/tool.stl')
  return existsSync(fallback) ? fallback : null
}

export function loadTexturizerSoakVerticesFromStl(filePath: string): Float32Array {
  const buf = readFileSync(filePath)
  const geo = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const pos = geo.getAttribute('position')
  if (!pos?.array?.length) throw new Error(`empty STL: ${filePath}`)
  const src = pos.array
  const out = new Float32Array(src.length)
  for (let i = 0; i < src.length; i += 1) out[i] = Number(src[i] ?? 0)
  return out
}

export function texturizerTriangleCountFromVertices(vertices: Float32Array): number {
  return Math.floor(vertices.length / 9)
}
