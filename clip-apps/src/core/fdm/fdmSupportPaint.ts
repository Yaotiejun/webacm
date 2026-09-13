/**
 * FDM manual support paint points (Kiri widget.anno.paint).
 * Drag strokes densify points like Kiri paint spacing; overlay uses shared sphere geos.
 */
import * as THREE from 'three'

export type FdmPaintPoint = {
  point: { x: number; y: number; z: number }
  radius: number
}

export function clonePaintPoints(paint: FdmPaintPoint[] | undefined): FdmPaintPoint[] {
  if (!Array.isArray(paint)) return []
  return paint.map((p) => ({
    point: { x: Number(p.point?.x) || 0, y: Number(p.point?.y) || 0, z: Number(p.point?.z) || 0 },
    radius: Math.max(0.2, Number(p.radius) || 2),
  }))
}

/** Raycast hit → paint sphere in displayRoot / platform space. */
export function paintPointFromWorldHit(
  hit: { x: number; y: number; z: number },
  radius = 2,
): FdmPaintPoint {
  return {
    point: { x: hit.x, y: hit.y, z: hit.z },
    radius: Math.max(0.2, radius),
  }
}

/** Min spacing between stroke samples (Kiri-like densify). */
export function paintStrokeSpacing(radius: number): number {
  return Math.max(0.35, Math.min(radius, radius * 0.45))
}

export function paintDistance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Add a paint point if far enough from the last sample (or always if list empty).
 * Returns whether a point was appended.
 */
export function appendPaintIfSpaced(
  list: FdmPaintPoint[],
  hit: { x: number; y: number; z: number },
  radius: number,
  spacing = paintStrokeSpacing(radius),
): boolean {
  const last = list[list.length - 1]
  if (last && paintDistance(last.point, hit) < spacing) return false
  list.push(paintPointFromWorldHit(hit, radius))
  return true
}

/** Erase all paint spheres within `radius` of hit. */
export function erasePaintNear(
  list: FdmPaintPoint[],
  hit: { x: number; y: number; z: number },
  radius: number,
): FdmPaintPoint[] {
  const r = Math.max(0.2, radius)
  return list.filter((p) => paintDistance(p.point, hit) > r)
}

const sphereGeoCache = new Map<string, THREE.SphereGeometry>()

function sphereGeo(radius: number): THREE.SphereGeometry {
  const key = radius.toFixed(2)
  let g = sphereGeoCache.get(key)
  if (!g) {
    // Lower segment count for denser strokes
    g = new THREE.SphereGeometry(radius, 10, 8)
    sphereGeoCache.set(key, g)
  }
  return g
}

/** Rebuild paint spheres under `group` (platform / displayRoot local space). */
export function syncPaintOverlayGroup(
  group: THREE.Group,
  paintsByModel: Iterable<{ paint?: FdmPaintPoint[] }>,
  opts?: { color?: number; opacity?: number },
): void {
  while (group.children.length) {
    const c = group.children.pop()!
    const mesh = c as THREE.Mesh
    const mat = mesh.material as THREE.Material | THREE.Material[]
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose?.()
    group.remove(c)
  }

  const color = opts?.color ?? 0xe6a23c
  const opacity = opts?.opacity ?? 0.5
  for (const model of paintsByModel) {
    for (const p of clonePaintPoints(model.paint)) {
      const mat = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        emissive: color,
        emissiveIntensity: 0.15,
      })
      const mesh = new THREE.Mesh(sphereGeo(p.radius), mat)
      mesh.position.set(p.point.x, p.point.y, p.point.z)
      mesh.renderOrder = 5
      group.add(mesh)
    }
  }
}
