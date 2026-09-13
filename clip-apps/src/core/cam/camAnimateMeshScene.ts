/**
 * Apply Kiri CAM animate mesh protocol events to a Three.js group.
 * Coordinates: WCS Z-up → viewport Y-up (x, z, y) — same as G-code path preview.
 *
 * Stock meshes backed by SharedArrayBuffer keep a WCS view; `mesh_update` re-syncs
 * the remapped attribute so continuous material-removal is visible.
 */
import * as THREE from 'three'

export type CamAnimateMeshEvent = Record<string, unknown>

function remapWcsInto(dst: Float32Array, src: Float32Array): void {
  const n = Math.floor(Math.min(dst.length, src.length) / 3)
  for (let i = 0; i < n; i += 1) {
    const x = src[i * 3]!
    const y = src[i * 3 + 1]!
    const z = src[i * 3 + 2]!
    dst[i * 3] = x
    dst[i * 3 + 1] = z
    dst[i * 3 + 2] = y
  }
}

function resolveWcsPositions(payload: {
  pos?: ArrayLike<number> | Float32Array
  sab?: ArrayBufferLike
}): Float32Array | null {
  if (payload.sab) {
    return new Float32Array(payload.sab as ArrayBuffer)
  }
  if (payload.pos) {
    return payload.pos instanceof Float32Array
      ? payload.pos
      : Float32Array.from(payload.pos as ArrayLike<number>)
  }
  return null
}

type MeshEntry = {
  obj: THREE.Object3D
  /** Live WCS positions (often a SAB view mutated by anim-2d-be). */
  wcsPos?: Float32Array
  threeAttr?: THREE.BufferAttribute
}

export type CamAnimateMeshHandle = {
  applyEvents: (events: CamAnimateMeshEvent[]) => void
  clear: () => void
  dispose: () => void
  meshCount: () => number
}

/**
 * Creates a protocol applicator bound to `group` (added to scene by caller).
 */
export function createCamAnimateMeshHandle(group: THREE.Group): CamAnimateMeshHandle {
  const meshes = new Map<number, MeshEntry>()
  const stockMat = new THREE.MeshStandardMaterial({
    color: 0xb0b3b8,
    transparent: true,
    opacity: 0.55,
    metalness: 0.05,
    roughness: 0.85,
    side: THREE.DoubleSide,
  })
  const lineMat = new THREE.LineBasicMaterial({ color: 0x909399, transparent: true, opacity: 0.8 })

  function disposeObject(obj: THREE.Object3D) {
    group.remove(obj)
    obj.traverse((c) => {
      const mesh = c as THREE.Mesh
      mesh.geometry?.dispose?.()
    })
  }

  function clear() {
    for (const entry of meshes.values()) disposeObject(entry.obj)
    meshes.clear()
  }

  function syncThreeFromWcs(entry: MeshEntry) {
    if (!entry.wcsPos || !entry.threeAttr) return
    const arr = entry.threeAttr.array as Float32Array
    remapWcsInto(arr, entry.wcsPos)
    entry.threeAttr.needsUpdate = true
    const geo = (entry.obj as THREE.Mesh).geometry
    if (geo && entry.obj instanceof THREE.Mesh) {
      geo.computeVertexNormals()
    }
  }

  function meshAdd(raw: Record<string, unknown>) {
    const id = Number(raw.id)
    if (!Number.isFinite(id)) return
    const prev = meshes.get(id)
    if (prev) disposeObject(prev.obj)

    const wcsPos = resolveWcsPositions(raw as { pos?: Float32Array; sab?: ArrayBufferLike })
    if (!wcsPos || wcsPos.length < 9) return
    const remapped = new Float32Array(wcsPos.length)
    remapWcsInto(remapped, wcsPos)
    const geo = new THREE.BufferGeometry()
    const attr = new THREE.BufferAttribute(remapped, 3)
    geo.setAttribute('position', attr)

    const ind = raw.ind as ArrayLike<number> | undefined
    let obj: THREE.Object3D
    if (ind && (ind as ArrayLike<number>).length) {
      geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(ind as ArrayLike<number>), 1))
      geo.computeVertexNormals()
      const mesh = new THREE.Mesh(geo, stockMat.clone())
      mesh.renderOrder = -10
      obj = mesh
    } else {
      obj = new THREE.LineSegments(geo, lineMat.clone())
    }
    group.add(obj)
    meshes.set(id, {
      obj,
      wcsPos: raw.sab ? wcsPos : undefined,
      threeAttr: attr,
    })
  }

  function meshMove(raw: Record<string, unknown>) {
    const id = Number(raw.id ?? raw.toolID)
    const entry = meshes.get(id)
    const pos = raw.pos as { x?: number; y?: number; z?: number } | undefined
    if (!entry || !pos) return
    const x = Number(pos.x) || 0
    const y = Number(pos.y) || 0
    const z = Number(pos.z) || 0
    entry.obj.position.set(x, z, y)
  }

  function meshUpdate(raw: Record<string, unknown>) {
    const id = Number(raw.id)
    const entry = meshes.get(id)
    if (!entry) return
    if (entry.wcsPos) syncThreeFromWcs(entry)
    else if (entry.threeAttr) entry.threeAttr.needsUpdate = true
  }

  function meshDel(idRaw: unknown) {
    const id = Number(idRaw)
    const entry = meshes.get(id)
    if (!entry) return
    disposeObject(entry.obj)
    meshes.delete(id)
  }

  function applyEvents(events: CamAnimateMeshEvent[]) {
    for (const ev of events) {
      if (ev.mesh_add && typeof ev.mesh_add === 'object') {
        meshAdd(ev.mesh_add as Record<string, unknown>)
      }
      if (ev.mesh_move && typeof ev.mesh_move === 'object') {
        meshMove(ev.mesh_move as Record<string, unknown>)
      }
      if (ev.mesh_update != null && ev.id != null) {
        meshUpdate(ev as Record<string, unknown>)
      }
      if (ev.mesh_del != null) {
        meshDel(ev.mesh_del)
      }
    }
  }

  return {
    applyEvents,
    clear,
    dispose: () => {
      clear()
      stockMat.dispose()
      lineMat.dispose()
    },
    meshCount: () => meshes.size,
  }
}
