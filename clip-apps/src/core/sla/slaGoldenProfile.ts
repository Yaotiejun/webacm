/**
 * Pinned SLA 10mm-cube golden profile (SLA-CUBE soak).
 */
import { createHash } from 'node:crypto'
import { runSlaFromMesh } from '@/core/sla/slaEngine'

/** Axis-aligned 10mm cube as triangle soup (12 tris) — shared golden/SLA fixture. */
export function slaGoldenCube10mm(): Float32Array {
  const s = 10
  const v = [
    0, 0, 0, s, 0, 0, s, s, 0,
    0, 0, 0, s, s, 0, 0, s, 0,
    0, 0, s, s, s, s, s, 0, s,
    0, 0, s, 0, s, s, s, s, s,
    0, 0, 0, s, 0, s, s, 0, 0,
    0, 0, 0, 0, 0, s, s, 0, s,
    0, s, 0, s, s, 0, s, s, s,
    0, s, 0, s, s, s, 0, s, s,
    0, 0, 0, 0, s, 0, 0, s, s,
    0, 0, 0, 0, s, s, 0, 0, s,
    s, 0, 0, s, 0, s, s, s, s,
    s, 0, 0, s, s, s, s, s, 0,
  ]
  return new Float32Array(v)
}

/** Cantilever: base pad + overhang block (for pillar support tests). */
export function slaCantileverFixture(): Float32Array {
  // Base 10x10x2 at z=0..2, overhang 10x10x2 at z=8..10 shifted +X
  const tris: number[] = []
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
    // bottom
    tris.push(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0)
    // top
    tris.push(x0, y0, z1, x1, y1, z1, x1, y0, z1, x0, y0, z1, x0, y1, z1, x1, y1, z1)
    // -Y
    tris.push(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z0, x1, y0, z1, x0, y0, z1)
    // +Y
    tris.push(x0, y1, z0, x1, y1, z1, x1, y1, z0, x0, y1, z0, x0, y1, z1, x1, y1, z1)
    // -X
    tris.push(x0, y0, z0, x0, y1, z0, x0, y1, z1, x0, y0, z0, x0, y1, z1, x0, y0, z1)
    // +X
    tris.push(x1, y0, z0, x1, y1, z1, x1, y1, z0, x1, y0, z0, x1, y0, z1, x1, y1, z1)
  }
  box(0, 0, 0, 10, 10, 2)
  box(10, 0, 8, 20, 10, 10)
  return new Float32Array(tris)
}

export const SLA_CUBE_GOLDEN_OPTS = {
  layerHeight: 1.0,
  resolution: { w: 64, h: 64 },
  bed: { x: 120, y: 68, z: 150 },
} as const

/** Full-blob SHA-256 (deterministic TS MVP writers). */
export function slaBlobStructuralDigest(buf: ArrayBuffer): string {
  return createHash('sha256').update(Buffer.from(buf)).digest('hex')
}

export async function computeSlaCubePhotonSha256(): Promise<string> {
  const result = await runSlaFromMesh(slaGoldenCube10mm(), {
    ...SLA_CUBE_GOLDEN_OPTS,
    exportFormat: 'photon',
  })
  return slaBlobStructuralDigest(result.blob)
}

export async function computeSlaCubeCtbSha256(): Promise<string> {
  const result = await runSlaFromMesh(slaGoldenCube10mm(), {
    ...SLA_CUBE_GOLDEN_OPTS,
    exportFormat: 'ctb',
  })
  return slaBlobStructuralDigest(result.blob)
}

export async function computeSlaCubeGooSha256(): Promise<string> {
  const result = await runSlaFromMesh(slaGoldenCube10mm(), {
    ...SLA_CUBE_GOLDEN_OPTS,
    exportFormat: 'goo',
  })
  return slaBlobStructuralDigest(result.blob)
}

export const SLA_CUBE_PHOTON_SHA256 = '95066e745a34aaadd43b5b398cf1a4142235242a9400627ea3e7d422440a47a6'
export const SLA_CUBE_CTB_SHA256 = '85960d567a4682622a491045cc50e234175daf3fa62a9c5d5e2f06e771e100a2'
export const SLA_CUBE_GOO_SHA256 = 'a6907a46698190499e483bfdbd8267b43a3d96932b24fe364f7150b69d0900e8'
