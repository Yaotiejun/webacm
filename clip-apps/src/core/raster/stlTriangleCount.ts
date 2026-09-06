/**
 * grip `*-baseline.json` `terrainTriangles` / `toolTriangles` are STL face counts.
 * Three.js STLLoader stores 3 non-indexed vertices per face (position.count = faces × 3).
 */
export function stlTriangleCountFromPositions(positions: Float32Array): number {
  return positions.length / 9
}

export function stlTriangleCountFromPositionCount(positionCount: number): number {
  return positionCount / 3
}
