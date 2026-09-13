/**
 * Kiri-like SLA slice stack overlay (Y-up viewport).
 * Seated WCS (x,y,z) → Three (x, z, y). Volumes extruded by layer height like Kiri addZVolume.
 * Cached per-layer groups + setRange for smooth animate (Kiri STACKS.setRange).
 */
import * as THREE from 'three'
import type { SlaLayer } from '@/core/sla/slaLayers'

export function clearSlaSliceOverlay(group: THREE.Group | null) {
  if (!group) return
  while (group.children.length) {
    const c = group.children.pop()!
    group.remove(c)
    disposeObject(c)
  }
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh | THREE.Line
    mesh.geometry?.dispose?.()
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose?.())
    else mat?.dispose?.()
  })
}

function nearly(a: { x: number; y: number }, b: { x: number; y: number }, eps = 1e-4) {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps
}

/** Close open rings so ExtrudeGeometry / Shape are valid. */
export function closeSlaPoly(poly: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (poly.length < 2) return poly.slice()
  const out = poly.map((p) => ({ x: p.x, y: p.y }))
  const a = out[0]!
  const b = out[out.length - 1]!
  if (!nearly(a, b)) out.push({ x: a.x, y: a.y })
  return out
}

/**
 * Build an extruded slab in Three space matching arrange mesh mapping:
 * WCS (x,y) at height z → Three (x, z±h/2, y).
 */
export function buildSlaLayerVolumeMesh(
  poly: Array<{ x: number; y: number }>,
  z: number,
  height: number,
  color: number,
  opacity: number,
): THREE.Mesh | null {
  const closed = closeSlaPoly(poly)
  if (closed.length < 4) return null
  const shape = new THREE.Shape()
  shape.moveTo(closed[0]!.x, -closed[0]!.y)
  for (let i = 1; i < closed.length; i += 1) {
    shape.lineTo(closed[i]!.x, -closed[i]!.y)
  }
  const h = Math.max(1e-4, height)
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  })
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity >= 0.95,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = z - h * 0.5
  mesh.name = 'sla-layer-volume'
  return mesh
}

function addLayerOutline(
  group: THREE.Group,
  poly: Array<{ x: number; y: number }>,
  z: number,
  color: number,
  opacity: number,
) {
  if (poly.length < 2) return
  const closed = closeSlaPoly(poly)
  const positions: number[] = []
  for (const p of closed) {
    positions.push(p.x, z, p.y)
  }
  const lineGeom = new THREE.BufferGeometry()
  lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  group.add(
    new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(1, opacity + 0.2),
      }),
    ),
  )
}

function buildOneLayerGroup(
  layer: SlaLayer,
  height: number,
  color: number,
  opacity: number,
): THREE.Group {
  const g = new THREE.Group()
  g.name = `sla-layer-${layer.z}`
  for (const poly of layer.fills) {
    if (poly.length < 2) continue
    if (poly.length >= 3) {
      const mesh = buildSlaLayerVolumeMesh(poly, layer.z, height, color, opacity)
      if (mesh) g.add(mesh)
    }
    addLayerOutline(g, poly, layer.z, 0xfff8c8, opacity)
  }
  return g
}

function styleLayerGroup(group: THREE.Group, isTop: boolean, fade: number) {
  const opacity = isTop ? 0.78 : 0.16 + fade * 0.32
  const color = isTop ? 0xfcba03 : 0x0099cc
  group.traverse((c) => {
    const mesh = c as THREE.Mesh
    if (!mesh.isMesh) return
    const mat = mesh.material as THREE.MeshBasicMaterial
    if (!mat?.isMaterial) return
    mat.color.setHex(color)
    mat.opacity = opacity
    mat.transparent = true
    mat.depthWrite = isTop
    mat.needsUpdate = true
  })
}

export function inferSlaOverlayLayerHeight(layers: SlaLayer[], fallback = 0.05): number {
  for (let i = 1; i < layers.length; i += 1) {
    const d = Math.abs(layers[i]!.z - layers[i - 1]!.z)
    if (d > 1e-6) return d
  }
  return Math.max(1e-4, fallback)
}

/** Kiri STACKS-like handle: build once, toggle visibility for animate scrubbing. */
export type SlaSliceStackHandle = {
  root: THREE.Group
  layerCount: number
  /** Show layers lo..hi inclusive (Kiri setRange). */
  setRange: (lo: number, hi: number) => void
  dispose: () => void
}

/**
 * Create a cached layer stack under `parent`. Call setRange(0, n) to grow the stack.
 */
export function createSlaSliceStack(
  parent: THREE.Group,
  layers: SlaLayer[],
  layerHeightMm?: number,
): SlaSliceStackHandle {
  clearSlaSliceOverlay(parent)
  const root = parent
  root.name = 'sla-slice-stack'
  const height = inferSlaOverlayLayerHeight(layers, layerHeightMm ?? 0.05)
  const cache: Array<THREE.Group | null> = layers.map(() => null)

  const ensure = (i: number): THREE.Group | null => {
    if (i < 0 || i >= layers.length) return null
    let g = cache[i]
    if (g) return g
    const layer = layers[i]!
    g = buildOneLayerGroup(layer, height, 0x0099cc, 0.35)
    g.visible = false
    cache[i] = g
    root.add(g)
    return g
  }

  const setRange = (lo: number, hi: number) => {
    if (!layers.length) return
    const min = Math.max(0, Math.min(lo, hi))
    const max = Math.min(layers.length - 1, Math.max(lo, hi))
    const windowStart = Math.max(min, max - 64)
    for (let i = 0; i < layers.length; i += 1) {
      if (i < min || i > max) {
        const g = cache[i]
        if (g) g.visible = false
        continue
      }
      // Keep a visibility window to limit draw cost on tall prints
      if (i < windowStart) {
        const g = cache[i]
        if (g) g.visible = false
        continue
      }
      const g = ensure(i)
      if (!g) continue
      g.visible = true
      const isTop = i === max
      const fade = (i - windowStart) / Math.max(1, max - windowStart)
      styleLayerGroup(g, isTop, fade)
    }
  }

  const dispose = () => {
    clearSlaSliceOverlay(root)
    for (let i = 0; i < cache.length; i += 1) cache[i] = null
  }

  return { root, layerCount: layers.length, setRange, dispose }
}

/**
 * Draw layers 0..activeIndex (rebuild). Prefer createSlaSliceStack for animate.
 */
export function buildSlaSliceOverlay(
  group: THREE.Group,
  layers: SlaLayer[],
  activeIndex: number,
  layerHeightMm?: number,
) {
  const stack = createSlaSliceStack(group, layers, layerHeightMm)
  if (!layers.length || activeIndex < 0) return
  stack.setRange(0, Math.min(activeIndex, layers.length - 1))
}

/** Count polygons that can be drawn as volumes (≥3 pts). */
export function countDrawableSlaFills(layers: SlaLayer[]): number {
  let n = 0
  for (const L of layers) {
    for (const f of L.fills) {
      if (f.length >= 3) n += 1
    }
  }
  return n
}
