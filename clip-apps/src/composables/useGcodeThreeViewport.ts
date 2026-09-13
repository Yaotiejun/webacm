import { nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildGcodePathHint } from '@/core/gcode/gcodePathHint'
import { getCachedGcodePathBuild } from '@/core/gcode/gcodePathBuildCache'
import type { MachineEnvelopeMm } from '@/core/devices/carveraMachineEnvelope'
import {
  disposeCarveraMachineModel,
  loadCarveraMachineModel,
} from '@/core/devices/carveraMachineModelLoader'
import { filterFinitePathPositions3 } from '@/core/gcode/sanitizePathPositions'
import { applyPathProgressDrawRanges } from '@/core/gcode/gcodePathProgressDraw'

export type GcodeThreeToolPosition = { x: number; y: number; z: number }

export interface UseGcodeThreeViewportOptions {
  rootRef: Ref<HTMLElement | null>
  canvasRef: Ref<HTMLCanvasElement | null>
  jobGcode: Ref<string>
  toolPosition: Ref<GcodeThreeToolPosition>
  stemColor: Ref<number>
  pathColor: number
  /** When set, G0 rapid moves use this color; G1/G2/G3 use `pathColor`. */
  rapidPathColor?: number
  /** Cone / “tip” mesh color (default Carvera-style red) */
  tipColor?: number
  /** Hide CNC-style tool tip/stem (SLA / raster arrange). */
  hideToolMarker?: boolean
  cameraPosition?: [number, number, number]
  gridSize?: number
  gridDivisions?: number
  axesSize?: number
  minOrbitDistance?: number
  maxOrbitDistance?: number
  /** Work-area wireframe (WCS 0..width/depth/height, corner origin). */
  machineEnvelope?: MachineEnvelopeMm
  /** grip carve-control `carvera.obj` URL (Carvera workspace). */
  machineModelUrl?: string
  /** 0..1 reveal of built path lines (CAM animate progress). Default 1 = full. */
  pathProgress?: Ref<number>
}

function gcodeToThreePosition(x: number, y: number, z: number) {
  return new THREE.Vector3(x, z, y)
}

function wcsPathBufferToThree(wcs: Float32Array): Float32Array {
  const n = wcs.length / 3
  const out = new Float32Array(wcs.length)
  for (let i = 0; i < n; i += 1) {
    const p = gcodeToThreePosition(wcs[i * 3]!, wcs[i * 3 + 1]!, wcs[i * 3 + 2]!)
    out[i * 3] = p.x
    out[i * 3 + 1] = p.y
    out[i * 3 + 2] = p.z
  }
  return out
}

export function useGcodeThreeViewport(opts: UseGcodeThreeViewportOptions) {
  const jobPathHint = ref('')
  let viewportReady = false
  let renderer: THREE.WebGLRenderer | null = null
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let controls: InstanceType<typeof OrbitControls> | null = null
  let toolMarker: THREE.Group | null = null
  let raf = 0
  let resizeObs: ResizeObserver | null = null
  let jobPathLines: THREE.Line[] = []
  let machineEnvelopeLines: THREE.LineSegments | null = null
  let machineModelRoot: THREE.Group | null = null
  let animateStockGroup: THREE.Group | null = null
  let lastBuiltGcode = ''
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined

  const tipColor = opts.tipColor ?? 0xc45656
  const camPos = opts.cameraPosition ?? ([180, 140, 180] as const)
  const gridSize = opts.gridSize ?? 400
  const gridDivisions = opts.gridDivisions ?? 40
  const axesSize = opts.axesSize ?? 60
  const minOrbit = opts.minOrbitDistance ?? 40
  const maxOrbit = opts.maxOrbitDistance ?? 1200

  function disposeJobPathLines() {
    if (!scene) return
    for (const line of jobPathLines) {
      scene.remove(line)
      line.geometry.dispose()
      const m = line.material
      if (Array.isArray(m)) m.forEach((mm) => mm.dispose())
      else m.dispose()
    }
    jobPathLines = []
  }

  function addPathLine(positions: Float32Array, color: number) {
    const finite = filterFinitePathPositions3(positions)
    if (!scene || finite.length < 6) return
    const arr = wcsPathBufferToThree(finite)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color }))
    scene.add(line)
    jobPathLines.push(line)
  }

  function rebuildJobPath() {
    if (!scene) return
    const text = opts.jobGcode.value ?? ''
    if (text === lastBuiltGcode && jobPathLines.length > 0) {
      applyPathProgress()
      return
    }
    lastBuiltGcode = text
    disposeJobPathLines()
    if (!text.trim()) {
      jobPathHint.value = ''
      return
    }
    const built = getCachedGcodePathBuild(text)
    const hint = buildGcodePathHint(built)
    if (built.vertexCount < 2) {
      jobPathHint.value = hint
      return
    }
    jobPathHint.value = hint
    const rapidColor = opts.rapidPathColor
    if (rapidColor != null && built.segments.length > 0) {
      for (const seg of built.segments) {
        addPathLine(seg.positions, seg.kind === 'rapid' ? rapidColor : opts.pathColor)
      }
      applyPathProgress()
      return
    }
    addPathLine(built.positions, opts.pathColor)
    applyPathProgress()
  }

  function applyPathProgress() {
    const raw = opts.pathProgress?.value
    const fraction = raw == null || !Number.isFinite(raw) ? 1 : raw
    applyPathProgressDrawRanges(
      jobPathLines.map((line) => ({
        setDrawRange: (start, count) => line.geometry.setDrawRange(start, count),
        getVertexCount: () => line.geometry.getAttribute('position')?.count ?? 0,
      })),
      fraction,
    )
  }

  function disposeViewport() {
    cancelAnimationFrame(raf)
    raf = 0
    resizeObs?.disconnect()
    resizeObs = null
    controls?.dispose()
    controls = null
    if (scene) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
          obj.geometry?.dispose()
          const mats = obj.material
          if (Array.isArray(mats)) mats.forEach((m) => m.dispose())
          else mats?.dispose()
        }
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
          const mats = obj.material
          if (Array.isArray(mats)) mats.forEach((m) => m.dispose())
          else mats?.dispose()
        }
      })
      scene.clear()
    }
    scene = null
    renderer?.dispose()
    renderer = null
    camera = null
    toolMarker = null
    jobPathLines = []
    machineEnvelopeLines = null
    if (machineModelRoot) {
      disposeCarveraMachineModel(machineModelRoot)
      machineModelRoot = null
    }
    animateStockGroup = null
    lastBuiltGcode = ''
    if (rebuildTimer != null) clearTimeout(rebuildTimer)
    rebuildTimer = undefined
    viewportReady = false
  }

  function getOrCreateAnimateStockGroup(): THREE.Group | null {
    if (!scene) return null
    if (!animateStockGroup) {
      animateStockGroup = new THREE.Group()
      animateStockGroup.name = 'cam-animate-stock'
      scene.add(animateStockGroup)
    }
    return animateStockGroup
  }

  function clearAnimateStockGroup() {
    if (!animateStockGroup || !scene) {
      animateStockGroup = null
      return
    }
    while (animateStockGroup.children.length) {
      const c = animateStockGroup.children.pop()!
      animateStockGroup.remove(c)
      c.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose?.()
        const mats = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(mats)) mats.forEach((m) => m.dispose())
        else mats?.dispose?.()
      })
    }
    scene.remove(animateStockGroup)
    animateStockGroup = null
  }

  /** Frame camera on animate-stock contents (Kiri-like after import/slice). */
  function fitCameraToAnimateStock(padding = 2.4) {
    if (!camera || !controls || !animateStockGroup) return false
    const box = new THREE.Box3().setFromObject(animateStockGroup)
    if (box.isEmpty()) return false
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const maxDim = Math.max(size.x, size.y, size.z, 1)
    const dist = maxDim * padding + 12
    camera.position.set(center.x + dist * 0.85, center.y + dist * 0.7, center.z + dist * 0.85)
    camera.near = Math.max(0.01, dist / 200)
    camera.far = Math.max(1000, dist * 20)
    camera.updateProjectionMatrix()
    controls.target.copy(center)
    controls.minDistance = Math.max(1, maxDim * 0.2)
    controls.maxDistance = Math.max(controls.minDistance * 20, dist * 8)
    controls.update()
    return true
  }

  function tick() {
    if (!renderer || !scene || !camera) return
    controls?.update()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  function layoutViewport() {
    const root = opts.rootRef.value
    const canvas = opts.canvasRef.value
    if (!root || !canvas || !renderer || !camera) return
    const w = Math.max(1, Math.floor(root.clientWidth))
    const h = Math.max(1, Math.floor(root.clientHeight))
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
  }

  function updateToolFromMachine() {
    if (!toolMarker) return
    const p = opts.toolPosition.value
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return
    const v = gcodeToThreePosition(p.x, p.y, p.z)
    toolMarker.position.copy(v)
    if (controls) {
      controls.target.copy(v)
      controls.update()
    }
  }

  function applyStemColor() {
    const stem = toolMarker?.children[0] as THREE.Mesh | undefined
    const hex = opts.stemColor.value
    if (stem?.material instanceof THREE.MeshStandardMaterial && Number.isFinite(hex)) {
      stem.material.color.setHex(hex)
    }
  }

  function initViewport() {
    const canvas = opts.canvasRef.value
    const root = opts.rootRef.value
    if (!canvas || !root) return

    disposeViewport()

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf5f7fa)

    const w = Math.max(1, Math.floor(root.clientWidth))
    const h = Math.max(1, Math.floor(root.clientHeight))
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 5000)
    camera.position.set(camPos[0], camPos[1], camPos[2])

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    layoutViewport()

    const ambient = new THREE.AmbientLight(0xffffff, 0.55)
    const dir = new THREE.DirectionalLight(0xffffff, 0.75)
    dir.position.set(40, 120, 60)
    scene.add(ambient, dir)

    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x909399, 0xc0c4cc)
    scene.add(grid)

    const axes = new THREE.AxesHelper(axesSize)
    scene.add(axes)

    const env = opts.machineEnvelope
    if (env) {
      const w = env.widthMm
      const d = env.depthMm
      const h = env.maxHeightMm
      const box = new THREE.BoxGeometry(w, h, d)
      machineEnvelopeLines = new THREE.LineSegments(
        new THREE.EdgesGeometry(box),
        new THREE.LineBasicMaterial({ color: 0x909399, transparent: true, opacity: 0.85 }),
      )
      machineEnvelopeLines.position.set(w / 2, h / 2, d / 2)
      scene.add(machineEnvelopeLines)
      box.dispose()
    }

    const modelUrl = opts.machineModelUrl
    if (modelUrl) {
      void loadCarveraMachineModel(modelUrl)
        .then((model) => {
          if (!scene) return
          machineModelRoot = model
          scene.add(model)
        })
        .catch(() => {
          // Asset missing until `npm run sync:grip-carvera-assets`; envelope wireframe remains.
        })
    }

    if (!opts.hideToolMarker) {
      toolMarker = new THREE.Group()
      const stemHex = Number.isFinite(opts.stemColor.value) ? opts.stemColor.value : 0x909399
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 3.5, 22, 16),
        new THREE.MeshStandardMaterial({
          color: stemHex,
          metalness: 0.15,
          roughness: 0.55,
        }),
      )
      stem.position.y = 11
      const tip = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 10, 16),
        new THREE.MeshStandardMaterial({ color: tipColor, metalness: 0.2, roughness: 0.45 }),
      )
      tip.position.y = 1
      tip.rotation.x = Math.PI
      toolMarker.add(stem, tip)
      scene.add(toolMarker)
    }

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = minOrbit
    controls.maxDistance = maxOrbit

    updateToolFromMachine()
    if (toolMarker) camera.lookAt(toolMarker.position)
    else camera.lookAt(0, 0, 0)

    resizeObs = new ResizeObserver(() => {
      layoutViewport()
    })
    resizeObs.observe(root)

    rebuildJobPath()
    tick()
  }

  function tryInitViewport() {
    if (viewportReady) return
    if (!opts.rootRef.value || !opts.canvasRef.value) return
    viewportReady = true
    void nextTick(() => initViewport())
  }

  watch(opts.jobGcode, () => {
    if (rebuildTimer != null) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => {
      rebuildTimer = undefined
      rebuildJobPath()
    }, 32)
  })

  watch(
    opts.toolPosition,
    () => {
      updateToolFromMachine()
    },
    { deep: true, immediate: true },
  )

  watch(opts.stemColor, applyStemColor, { immediate: true })

  if (opts.pathProgress) {
    watch(opts.pathProgress, () => applyPathProgress())
  }

  watch([opts.rootRef, opts.canvasRef], tryInitViewport, { flush: 'post' })

  onMounted(() => {
    tryInitViewport()
  })

  onBeforeUnmount(() => {
    disposeViewport()
  })

  return { jobPathHint, getOrCreateAnimateStockGroup, clearAnimateStockGroup, fitCameraToAnimateStock }
}
