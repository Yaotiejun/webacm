/**
 * Belt pre-pass (subset of Kiri worker.rotate) for bedBelt devices.
 * Rotates point cloud about X by sliceAngle and attaches widget.belt metadata.
 */
export type BeltPrepProcess = {
  sliceAngle?: number
  beltAnchor?: number
  firstLayerBeltLead?: number
  firstLayerYOffset?: number
  /** Anchor bump height (mm); consumed by legacy fdm/slice.js when bedBelt. */
  firstLayerBeltBump?: number
  /** First-layer extrusion multiplier on belt; consumed by fdm prepare. */
  firstLayerBeltFact?: number
}

export type BeltPrepDevice = {
  bedBelt?: boolean
  bedDepth?: number
}

export type BeltMeta = {
  angle: number
  xpos: number
  ypos: number
  dy: number
  dz: number
  cosf: number
  sinf: number
  slope: number
}

export function applyBeltPointRotation(
  points: Array<{ x: number; y: number; z: number; set?: (x: number, y: number, z: number) => void }>,
  angleDeg: number,
): void {
  const rad = (Math.PI / 180) * angleDeg
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  for (const p of points) {
    const y = p.y
    const z = p.z
    const ny = y * c - z * s
    const nz = y * s + z * c
    if (typeof p.set === 'function') p.set(p.x, ny, nz)
    else {
      p.y = ny
      p.z = nz
    }
  }
}

export function buildBeltMeta(opts: {
  process: BeltPrepProcess
  device: BeltPrepDevice
  minY: number
  maxY: number
  trackPosY?: number
}): BeltMeta | null {
  if (!opts.device.bedBelt) return null
  const angle = Number(opts.process.sliceAngle) > 0 ? Number(opts.process.sliceAngle) : 45
  const radians = Math.PI / 180
  const yoff =
    Number(opts.process.beltAnchor) ||
    Number(opts.process.firstLayerBeltLead) ||
    Number(opts.process.firstLayerYOffset) ||
    0
  const bedDepth = Number(opts.device.bedDepth) || 300
  const trackY = Number(opts.trackPosY) || 0
  return {
    angle,
    xpos: 0,
    ypos: bedDepth / 2 + trackY + opts.minY + yoff,
    dy: -opts.minY - yoff,
    dz: 0,
    cosf: Math.cos(radians * angle),
    sinf: Math.sin(radians * angle),
    slope: Math.tan(radians * (90 - angle)),
  }
}
