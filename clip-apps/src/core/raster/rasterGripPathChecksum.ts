import type { RasterPath } from '@/types/raster'

/** grip `planar-test.cjs` — `(checksum + z[i] * (i + 1)) | 0` over pathData. */
export function gripPlanarPathDataChecksum(pathData: ArrayLike<number>): number {
  let checksum = 0
  for (let i = 0; i < pathData.length; i += 1) {
    checksum = (checksum + (pathData[i] ?? 0) * (i + 1)) | 0
  }
  return checksum
}

/** Flatten Z from clip-apps scanline paths (path-major point order). */
export function flattenRasterPathsZ(paths: RasterPath[]): number[] {
  const out: number[] = []
  for (const p of paths) {
    for (const pt of p.points) out.push(pt[2] ?? 0)
  }
  return out
}

export function gripPlanarPathsChecksum(paths: RasterPath[]): number {
  return gripPlanarPathDataChecksum(flattenRasterPathsZ(paths))
}

/** grip `radial-test.cjs` — strips concatenated with running index offset. */
export function gripRadialStripsChecksum(strips: ArrayLike<number>[]): number {
  let checksum = 0
  let totalValues = 0
  for (const strip of strips) {
    for (let i = 0; i < strip.length; i += 1) {
      checksum = (checksum + (strip[i] ?? 0) * (totalValues + i + 1)) | 0
    }
    totalValues += strip.length
  }
  return checksum
}

export function gripRadialPathsChecksum(paths: RasterPath[]): number {
  const strips = paths.map((p) => flattenRasterPathsZ([p]))
  return gripRadialStripsChecksum(strips)
}
