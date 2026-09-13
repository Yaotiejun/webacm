/**
 * CAM animate bridge: path-progress + legacy anim-2d/3d continuous material-removal.
 */
import '@/core/cam/legacy/kiri/add/array.js'

export type CamAnimateMode = 'path-progress' | 'legacy-2d' | 'legacy-3d'

export type CamAnimateBridgeState = {
  mode: CamAnimateMode
  progress: number
  playing: boolean
  speed: number
}

export type CamAnimateBridgeControls = {
  getState: () => CamAnimateBridgeState
  setProgress: (p: number) => void
  play: () => void
  pause: () => void
  dispose: () => void
  /** Legacy stub: last mesh_add / progress payloads (for tests). */
  legacyEvents?: Array<Record<string, unknown>>
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v <= 0) return 0
  if (v >= 1) return 1
  return v
}

/**
 * Path-progress controller (CamWorkspace default). Mutates `pathProgress` ref-like.
 */
export function createPathProgressAnimateBridge(input: {
  getProgress: () => number
  setProgress: (p: number) => void
  speed?: number
}): CamAnimateBridgeControls {
  let playing = false
  let speed = Math.max(1, input.speed ?? 8)
  let timer: ReturnType<typeof setInterval> | null = null

  const stop = () => {
    playing = false
    if (timer != null) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    getState: () => ({
      mode: 'path-progress',
      progress: clamp01(input.getProgress()),
      playing,
      speed,
    }),
    setProgress: (p) => input.setProgress(clamp01(p)),
    play: () => {
      stop()
      playing = true
      const ms = Math.max(40, Math.round(1000 / Math.max(1, speed * 4)))
      timer = setInterval(() => {
        const step = Math.min(0.08, 0.01 + speed * 0.004)
        const cur = clamp01(input.getProgress())
        input.setProgress(cur >= 1 - 1e-6 ? 0 : Math.min(1, cur + step))
      }, ms)
    },
    pause: stop,
    dispose: stop,
  }
}

export type LegacyAnimatePrint = {
  output: unknown[]
}

export type LegacyCamAnimateSettings = {
  stock: { x: number; y: number; z: number; center?: { x: number; y: number; z: number } }
  tools?: unknown[]
  process?: Record<string, unknown>
  controller?: { animesh?: number | string }
}

const DEFAULT_ENDMILL = {
  id: 1,
  number: 1,
  metric: true,
  type: 'endmill',
  name: 'animate-default',
  flute_diam: 3.175,
  flute_len: 20,
  shaft_diam: 3.175,
  shaft_len: 20,
  taper_tip: 0,
}

/** Print point with Tool-like getID for anim-2d-be updateTool. */
export function makeLegacyAnimateToolRef(toolId = 1): { getID: () => number } {
  return { getID: () => toolId }
}

export function normalizeLegacyAnimatePrint(print: LegacyAnimatePrint, toolId = 1): LegacyAnimatePrint {
  const toolRef = makeLegacyAnimateToolRef(toolId)
  const output = (print.output ?? []).map((layer) => {
    if (!Array.isArray(layer)) return layer
    return layer.map((pt: any) => {
      if (!pt || typeof pt !== 'object') return pt
      if (pt.tool && typeof pt.tool.getID === 'function') return pt
      return { ...pt, tool: toolRef }
    })
  })
  return { output }
}

type AnimateSend = {
  data: (payload: Record<string, unknown>, transfer?: unknown) => void
  done: () => void
}

async function bootLegacyAnimateWorker(input: {
  mode: 'legacy-2d' | 'legacy-3d'
  print: LegacyAnimatePrint
}): Promise<{
  worker: {
    current: { print: LegacyAnimatePrint }
    dispatch: Record<string, (data: any, send: AnimateSend) => void>
  }
}> {
  const worker = {
    current: { print: normalizeLegacyAnimatePrint(input.print) },
    dispatch: {} as Record<string, (data: any, send: AnimateSend) => void>,
  }
  if (input.mode === 'legacy-2d') {
    const { init } = await import('@/core/cam/legacy/kiri/mode/cam/anim-2d-be.js')
    init(worker as any)
  } else {
    const { init } = await import('@/core/cam/legacy/kiri/mode/cam/anim-3d-be.js')
    init(worker as any)
  }
  return { worker }
}

function collectSend(): { send: AnimateSend; events: Array<Record<string, unknown>>; waitDone: () => Promise<void> } {
  const events: Array<Record<string, unknown>> = []
  let resolveDone: (() => void) | null = null
  let donePromise: Promise<void> | null = null
  const waitDone = () => {
    if (!donePromise) {
      donePromise = new Promise<void>((resolve) => {
        resolveDone = resolve
      })
    }
    return donePromise
  }
  const send: AnimateSend = {
    data: (payload) => {
      events.push(payload)
    },
    done: () => {
      events.push({ done: true })
      resolveDone?.()
      resolveDone = null
      donePromise = null
    },
  }
  return { send, events, waitDone }
}

/**
 * In-process legacy 2D animate_setup smoke (no Three mesh protocol).
 */
export async function runLegacyCamAnimateSetupSmoke(input: {
  mode: 'legacy-2d' | 'legacy-3d'
  print: LegacyAnimatePrint
  settings: LegacyCamAnimateSettings
}): Promise<{ events: Array<Record<string, unknown>>; stepsRun: number }> {
  const { worker } = await bootLegacyAnimateWorker(input)
  const setup = worker.dispatch.animate_setup
  const animate = worker.dispatch.animate
  if (typeof setup !== 'function') {
    throw new Error('legacy animate_setup missing after init')
  }

  const stock = {
    ...input.settings.stock,
    center: input.settings.stock.center ?? {
      x: input.settings.stock.x / 2,
      y: input.settings.stock.y / 2,
      z: input.settings.stock.z / 2,
    },
  }

  const { send, events, waitDone } = collectSend()
  setup(
    {
      settings: {
        stock,
        tools: input.settings.tools ?? [DEFAULT_ENDMILL],
        process: {
          camOriginCenter: false,
          camOriginTop: true,
          ...(input.settings.process ?? {}),
        },
        controller: { animesh: input.settings.controller?.animesh ?? 4 },
      },
    },
    send,
  )

  let stepsRun = 0
  if (typeof animate === 'function') {
    const batch = collectSend()
    animate({ speed: 4, steps: Infinity, pause: 0 }, batch.send)
    // Allow a few async renderMoves ticks
    await new Promise((r) => setTimeout(r, 30))
    worker.dispatch.animate_cleanup?.({}, batch.send)
    await Promise.race([batch.waitDone(), new Promise((r) => setTimeout(r, 200))])
    events.push(...batch.events)
    stepsRun = batch.events.filter((e) => e.mesh_update != null).length
  }

  void waitDone
  return { events, stepsRun }
}

export type LegacyCamAnimateSession = {
  setupEvents: Array<Record<string, unknown>>
  /** Run path deformation; returns events including mesh_update / progress. */
  step: (opts?: { speed?: number; steps?: number; pause?: number }) => Promise<Array<Record<string, unknown>>>
  getProgress: () => number
  dispose: () => void
}

/**
 * Long-lived legacy animate session for continuous material-removal (mesh_update).
 */
export async function createLegacyCamAnimateSession(input: {
  mode: 'legacy-2d' | 'legacy-3d'
  print: LegacyAnimatePrint
  settings: LegacyCamAnimateSettings
}): Promise<LegacyCamAnimateSession> {
  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error('SharedArrayBuffer required for CAM animate stock mesh')
  }

  const { worker } = await bootLegacyAnimateWorker(input)
  const setup = worker.dispatch.animate_setup
  const animate = worker.dispatch.animate
  if (typeof setup !== 'function' || typeof animate !== 'function') {
    throw new Error('legacy animate_setup/animate missing')
  }

  const stock = {
    ...input.settings.stock,
    center: input.settings.stock.center ?? {
      x: input.settings.stock.x / 2,
      y: input.settings.stock.y / 2,
      z: input.settings.stock.z / 2,
    },
  }

  const setupBatch = collectSend()
  setup(
    {
      settings: {
        stock,
        tools: input.settings.tools ?? [DEFAULT_ENDMILL],
        process: {
          camOriginCenter: false,
          camOriginTop: true,
          ...(input.settings.process ?? {}),
        },
        controller: { animesh: input.settings.controller?.animesh ?? 4 },
      },
    },
    setupBatch.send,
  )

  let lastProgress = 0
  let disposed = false

  return {
    setupEvents: setupBatch.events,
    getProgress: () => lastProgress,
    dispose: () => {
      disposed = true
      try {
        worker.dispatch.animate_cleanup?.({}, collectSend().send)
      } catch {
        /* ignore */
      }
    },
    step: async (opts) => {
      if (disposed) return []
      const batch = collectSend()
      const speed = Math.max(1, opts?.speed ?? 8)
      animate(
        {
          speed,
          steps: opts?.steps ?? Infinity,
          pause: opts?.pause ?? 0,
        },
        batch.send,
      )
      // Yield so setTimeout(renderMoves) can run
      const deadline = Date.now() + Math.min(800, 40 + speed * 20)
      while (Date.now() < deadline) {
        const hasDone = batch.events.some((e) => e.done)
        if (hasDone) break
        await new Promise((r) => setTimeout(r, 8))
      }
      if (!batch.events.some((e) => e.done)) {
        worker.dispatch.animate_cleanup?.({}, batch.send)
        await new Promise((r) => setTimeout(r, 20))
      }
      for (const ev of batch.events) {
        if (typeof ev.progress === 'number') lastProgress = clamp01(ev.progress)
      }
      return batch.events
    },
  }
}

export function createLegacyCamAnimateBridgeStub(input: {
  mode: 'legacy-2d' | 'legacy-3d'
  print: LegacyAnimatePrint
  settings: LegacyCamAnimateSettings
}): CamAnimateBridgeControls {
  let progress = 0
  let playing = false
  const events: Array<Record<string, unknown>> = []
  let disposed = false

  const boot = runLegacyCamAnimateSetupSmoke({
    mode: input.mode,
    print: input.print,
    settings: input.settings,
  }).then((r) => {
    events.push(...r.events)
    return r
  })

  return {
    getState: () => ({
      mode: input.mode,
      progress,
      playing,
      speed: 1,
    }),
    setProgress: (p) => {
      progress = clamp01(p)
    },
    play: () => {
      playing = true
      void boot.then((r) => {
        if (disposed) return
        progress = Math.min(1, progress + 0.1 * Math.max(1, r.stepsRun))
      })
    },
    pause: () => {
      playing = false
    },
    dispose: () => {
      disposed = true
      playing = false
    },
    legacyEvents: events,
  }
}
