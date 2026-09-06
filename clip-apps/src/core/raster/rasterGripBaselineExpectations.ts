/**
 * Expected outputs from grip `raster-path-main/test-output/*-baseline.json`
 * (same STL pair: terrain/tool triangle counts). Used for parity hints and future self-checks.
 */
export const GRIP_PLANAR_BASELINE_EXPECTATIONS = Object.freeze({
  terrainTriangles: 75_586,
  toolTriangles: 960,
  numScanlines: 1499,
  pointsPerLine: 1501,
  toolpathSize: 2_249_999,
  checksum: -838_563_865,
})

/** grip `radial-baseline.json` — resolution 0.1, rotationStep 1°. */
export const GRIP_RADIAL_BASELINE_EXPECTATIONS = Object.freeze({
  terrainTriangles: 75_586,
  toolTriangles: 960,
  numStrips: 360,
  totalPoints: 54_000,
  checksum: 312_526_634,
})

export function gripPlanarBaselineHint(): string {
  const e = GRIP_PLANAR_BASELINE_EXPECTATIONS
  return `grip 基线：${e.numScanlines}×${e.pointsPerLine} 栅格，checksum ${e.checksum}`
}

export function gripRadialBaselineHint(): string {
  const e = GRIP_RADIAL_BASELINE_EXPECTATIONS
  return `grip radial 基线：${e.numStrips} strips / ${e.totalPoints} pts，checksum ${e.checksum}`
}
