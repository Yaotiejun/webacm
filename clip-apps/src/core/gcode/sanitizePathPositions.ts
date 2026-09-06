/** Drop XYZ triples with non-finite components (keeps preview geometry valid for THREE). */
export function filterFinitePathPositions3(src: Float32Array | number[]): Float32Array {
  const out: number[] = []
  const n = Math.floor(src.length / 3)
  for (let i = 0; i < n; i += 1) {
    const x = src[i * 3]!
    const y = src[i * 3 + 1]!
    const z = src[i * 3 + 2]!
    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      out.push(x, y, z)
    }
  }
  return new Float32Array(out)
}

/** At least two finite vertices (one line segment). */
export function isRenderablePathPositions3(src: Float32Array | number[]): boolean {
  return filterFinitePathPositions3(src).length >= 6
}
