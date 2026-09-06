import type { TexturizeRequest } from '@/types/texturizer'

export interface ResolvedTexturizerParams {
  amplitude: number
  uvFrequency: number
  symmetricDisplacement: boolean
  subdivisionLevels: number
  decimationRatio: number
  mappingMode: number
  scaleU: number
  scaleV: number
  offsetU: number
  offsetV: number
  rotationDeg: number
  mappingBlend: number
  seamBandWidth: number
  capAngle: number
  topAngleLimit: number
  bottomAngleLimit: number
  exclusionMode: 'exclude' | 'include'
  excludedFaces: number[]
}

function clampSubdivisionLevels(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(3, Math.floor(n)))
}

function clampDecimationRatio(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 1
  return Math.max(0.05, Math.min(1, n))
}

function normalizeExcludedFaces(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (let i = 0; i < raw.length; i += 1) {
    const n = Math.floor(Number(raw[i]))
    if (!Number.isFinite(n) || n < 0 || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function resolveTexturizerParams(req: TexturizeRequest, defaultCubicMode: number): ResolvedTexturizerParams {
  const amplitude = req.amplitude
  const uvFrequency = Number.isFinite(req.frequency) && req.frequency > 0 ? req.frequency : 1
  return {
    amplitude,
    uvFrequency,
    symmetricDisplacement: req.symmetricDisplacement ?? false,
    subdivisionLevels: clampSubdivisionLevels(req.subdivisionLevels),
    decimationRatio: clampDecimationRatio(req.decimationRatio),
    mappingMode: req.mappingMode ?? defaultCubicMode,
    scaleU: req.scaleU ?? 1,
    scaleV: req.scaleV ?? 1,
    offsetU: req.offsetU ?? 0,
    offsetV: req.offsetV ?? 0,
    rotationDeg: req.rotationDeg ?? 0,
    mappingBlend: req.mappingBlend ?? 0,
    seamBandWidth: req.seamBandWidth ?? 0.5,
    capAngle: req.capAngle ?? 20,
    topAngleLimit: req.topAngleLimit ?? 0,
    bottomAngleLimit: req.bottomAngleLimit ?? 0,
    exclusionMode: req.exclusionMode ?? 'exclude',
    excludedFaces: normalizeExcludedFaces(req.excludedFaces),
  }
}
