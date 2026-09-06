/**
 * 4×4 planar grid (32 triangles) — medium regression mesh between single-tri and live STL size.
 */
export function buildTexturizerMediumRegressionVertices(): Float32Array {
  const n = 5
  const grid: number[] = []
  for (let iy = 0; iy < n; iy += 1) {
    for (let ix = 0; ix < n; ix += 1) {
      grid.push(ix / (n - 1), iy / (n - 1), 0)
    }
  }
  const tris: number[] = []
  const v = (ix: number, iy: number) => {
    const o = (iy * n + ix) * 3
    return [grid[o]!, grid[o + 1]!, grid[o + 2]!] as const
  }
  const pushTri = (a: readonly [number, number, number], b: readonly [number, number, number], c: readonly [number, number, number]) => {
    tris.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
  }
  for (let iy = 0; iy < n - 1; iy += 1) {
    for (let ix = 0; ix < n - 1; ix += 1) {
      pushTri(v(ix, iy), v(ix + 1, iy), v(ix, iy + 1))
      pushTri(v(ix + 1, iy), v(ix + 1, iy + 1), v(ix, iy + 1))
    }
  }
  return new Float32Array(tris)
}

export const TEXTURIZER_MEDIUM_MESH_TRIANGLE_COUNT = 32
