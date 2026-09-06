import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCamStore, type CamRunSnapshot } from './useCamStore'

describe('stores.useCamStore clone isolation', () => {
  beforeEach(() => {
    localStorage.removeItem('ws-cam-recent-runs')
    setActivePinia(createPinia())
  })

  it('loadSample stores canonical-only default process (no cmaPocket* keys, grip-aligned refine)', () => {
    const store = useCamStore()
    store.loadSample()
    const listed = store.profiles.find((p) => p.name === 'sample')
    expect(listed).toBeTruthy()
    const p = listed!.process as Record<string, unknown>
    expect('cmaPocketOutline' in p).toBe(false)
    expect('cmaPocketRefine' in p).toBe(false)
    expect(p.camPocketRefine).toBe(20)
  })

  it('applyProfile decouples active device/tools/process from the profiles[] snapshot', () => {
    const store = useCamStore()
    store.loadSample()
    const listed = store.profiles.find((p) => p.name === 'sample')
    expect(listed).toBeTruthy()
    const origName = listed!.device.deviceName
    expect(store.device?.deviceName).toBe(origName)
    store.device!.deviceName = 'Edited-in-session-only'
    expect(listed!.device.deviceName).toBe(origName)
  })

  it('cloneFromCurrent stores deep-cloned profile payloads', () => {
    const store = useCamStore()
    store.device = { deviceName: 'D1', nested: { a: 1 } } as any
    store.tools = [{ id: 1, type: 'endmill', metric: true, number: 1, flutes: 2, len: 10, name: 't', shaft: 3, flute: 2, taper: 0 }] as any
    store.process = { processName: 'P1', nested: { depth: 2 } } as any

    store.cloneFromCurrent('copy-1')
    const saved = store.profiles.find((p) => p.name === 'copy-1')
    expect(saved).toBeTruthy()

    ;(store.device as any).nested.a = 9
    ;(store.process as any).nested.depth = 7
    expect((saved as any).device.nested.a).toBe(1)
    expect((saved as any).process.nested.depth).toBe(2)
  })

  it('loadRunSnapshot canonicalizes process (legacy drillDown → camDrillDown)', () => {
    const store = useCamStore()
    const run: CamRunSnapshot = {
      id: 'r-can',
      createdAt: 1,
      name: 'run-can',
      profile: {
        device: { deviceName: 'D0' } as any,
        tools: [],
        process: { processName: 'P0', drillDown: 2.5, ops: [] } as any,
      },
      geometry: { id: 'g0', bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }, complexityHint: 1 },
      result: { backend: 'mock', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] } as any,
    }
    store.loadRunSnapshot(run)
    expect(store.process?.camDrillDown).toBe(2.5)
    expect((store.process as Record<string, unknown> | null)?.drillDown).toBeUndefined()
    const saved = store.profiles.find((p) => p.name === 'P0-snapshot')
    expect((saved?.process as Record<string, unknown> | undefined)?.drillDown).toBeUndefined()
    expect(saved?.process.camDrillDown).toBe(2.5)
  })

  it('loadRunSnapshot clones run profile before import', () => {
    const store = useCamStore()
    const run: CamRunSnapshot = {
      id: 'r1',
      createdAt: 1,
      name: 'run-1',
      profile: {
        device: { deviceName: 'D2', nested: { x: 1 } } as any,
        tools: [{ id: 1, type: 'endmill' } as any],
        process: { processName: 'P2', nested: { y: 2 } } as any,
      },
      geometry: { id: 'g1', bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }, complexityHint: 1 },
      result: { backend: 'mock', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] } as any,
    }
    store.loadRunSnapshot(run)

    ;(run.profile.device as any).nested.x = 9
    ;(run.profile.process as any).nested.y = 8
    expect((store.device as any).nested.x).toBe(1)
    expect((store.process as any).nested.y).toBe(2)
  })

  it('importProfile decouples store from caller-held object references', () => {
    const store = useCamStore()
    const device = { deviceName: 'Ext', nested: { k: 1 } } as any
    const tools: any[] = []
    const process = { processName: 'ExtProc', nested: { z: 2 } } as any
    store.importProfile({ device, tools, process }, 'imported-1')

    device.nested.k = 99
    process.nested.z = 88
    expect((store.device as any).nested.k).toBe(1)
    expect((store.process as any).nested.z).toBe(2)
    const saved = store.profiles.find((p) => p.name === 'imported-1')
    expect((saved as any).device.nested.k).toBe(1)
    expect((saved as any).process.nested.z).toBe(2)
  })

  it('importProfile applies active state from profiles[] row after canonical upsert', () => {
    const store = useCamStore()
    const device = { deviceName: 'D-sync' } as any
    const tools: any[] = []
    const process = { processName: 'P-sync', drillDown: 4, ops: [] } as any
    store.importProfile({ device, tools, process }, 'synced-import')
    const row = store.profiles.find((p) => p.name === 'synced-import')
    expect(row).toBeTruthy()
    expect(store.process?.camDrillDown).toBe(4)
    expect((store.process as Record<string, unknown> | null)?.drillDown).toBeUndefined()
    expect(row!.process.camDrillDown).toBe(4)
    expect((row!.process as Record<string, unknown>).drillDown).toBeUndefined()
    expect(store.process?.camDrillDown).toBe(row!.process.camDrillDown)
  })

  it('addRecentRun stores snapshot detached from caller-held run object', () => {
    const store = useCamStore()
    const run: CamRunSnapshot = {
      id: 'r-add',
      createdAt: 1,
      name: 'run-add',
      profile: {
        device: { deviceName: 'D3', nested: { q: 1 } } as any,
        tools: [],
        process: { processName: 'P3', nested: { r: 2 } } as any,
      },
      geometry: { id: 'g2', bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }, complexityHint: 1 },
      result: { backend: 'mock', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] } as any,
    }
    store.addRecentRun(run)
    ;(run.profile.device as any).nested.q = 9
    expect((store.recentRuns[0]?.profile.device as any).nested.q).toBe(1)
  })

  it('upsertProfile stores deep-cloned profile payloads', () => {
    const store = useCamStore()
    const device = { deviceName: 'D-up', nested: { k: 1 } } as any
    const tools: any[] = [{ id: 1, type: 'endmill' }]
    const process = { processName: 'P-up', nested: { z: 2 } } as any
    store.upsertProfile({ name: 'p-up', device, tools, process })

    const saved = store.profiles.find((p) => p.name === 'p-up')
    expect(saved).toBeTruthy()
    device.nested.k = 99
    process.nested.z = 88
    expect((saved as any).device.nested.k).toBe(1)
    expect((saved as any).process.nested.z).toBe(2)
  })

  it('importProfile merges legacy CAM process keys into canonical fields (drillDown → camDrillDown)', () => {
    const store = useCamStore()
    const device = { deviceName: 'D-legacy' } as any
    const tools: any[] = []
    const process = {
      processName: 'LegacyProc',
      camFastFeed: 3000,
      drillDown: 1.25,
      ops: [],
    } as any
    store.importProfile({ device, tools, process }, 'legacy-drill')
    expect(store.process?.camDrillDown).toBe(1.25)
    expect((store.process as Record<string, unknown> | null)?.drillDown).toBeUndefined()
    const saved = store.profiles.find((p) => p.name === 'legacy-drill')
    expect((saved?.process as Record<string, unknown> | undefined)?.drillDown).toBeUndefined()
  })

  it('exportProfileObject omits legacy keys when canonical field exists', () => {
    const store = useCamStore()
    store.device = { deviceName: 'D' } as any
    store.tools = []
    store.process = {
      processName: 'P',
      camDrillDown: 3,
      drillDown: 3,
      ops: [],
    } as any
    const out = store.exportProfileObject()
    expect((out!.process as Record<string, unknown>).drillDown).toBeUndefined()
    expect(out!.process.camDrillDown).toBe(3)
    expect((store.process as Record<string, unknown>).drillDown).toBe(3)
  })

  it('exportProfileObject returns plain clones detached from store state', () => {
    const store = useCamStore()
    store.device = { deviceName: 'D', nested: { v: 1 } } as any
    store.tools = [] as any
    store.process = { processName: 'P', nested: { w: 2 } } as any
    const out = store.exportProfileObject()
    expect(out).toBeTruthy()
    ;(out as any).device.nested.v = 99
    ;(out as any).process.nested.w = 88
    expect((store.device as any).nested.v).toBe(1)
    expect((store.process as any).nested.w).toBe(2)
  })

  it('addRecentRun persists canonical-only profile.process', () => {
    const store = useCamStore()
    const run: CamRunSnapshot = {
      id: 'r-norm',
      createdAt: 1,
      name: 'n',
      profile: {
        device: { deviceName: 'D' } as any,
        tools: [],
        process: { processName: 'P', camDrillDown: 2, drillDown: 2, ops: [] } as any,
      },
      geometry: { id: 'g', bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }, complexityHint: 1 },
      result: { backend: 'mock', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] } as any,
    }
    store.addRecentRun(run)
    expect((store.recentRuns[0]?.profile.process as Record<string, unknown>).drillDown).toBeUndefined()
    expect(store.recentRuns[0]?.profile.process.camDrillDown).toBe(2)
    const persisted = JSON.parse(localStorage.getItem('ws-cam-recent-runs')!) as CamRunSnapshot[]
    expect((persisted[0]!.profile.process as Record<string, unknown>).drillDown).toBeUndefined()
  })

  it('addRecentRun serializes STL vertices for localStorage and hydrates on read', () => {
    const store = useCamStore()
    const verts = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const run: CamRunSnapshot = {
      id: 'r-mesh',
      createdAt: 1,
      name: 'mesh-run',
      profile: {
        device: { deviceName: 'D' } as any,
        tools: [],
        process: { processName: 'P', ops: [] } as any,
      },
      geometry: {
        id: 'stl-part',
        bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 },
        complexityHint: 2,
        vertices: verts,
      },
      result: { backend: 'kiri-cam', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] } as any,
    }
    store.addRecentRun(run)
    expect(store.recentRuns[0]?.geometry.vertices).toBeInstanceOf(Float32Array)
    expect(store.recentRuns[0]?.geometry.vertices?.length).toBe(9)
    const persisted = JSON.parse(localStorage.getItem('ws-cam-recent-runs')!) as {
      geometry: { vertices?: number[] }
    }[]
    expect(Array.isArray(persisted[0]!.geometry.vertices)).toBe(true)
    expect(persisted[0]!.geometry.vertices).toHaveLength(9)
    store.loadRecentRuns()
    expect(store.recentRuns[0]?.geometry.vertices).toBeInstanceOf(Float32Array)
    expect(store.recentRuns[0]?.geometry.vertices?.length).toBe(9)
  })

  it('loadRecentRuns normalizes legacy process keys and rewrites storage', () => {
    const stored = [
      {
        id: 'r-old',
        createdAt: 1,
        name: 'old',
        profile: {
          device: { deviceName: 'D' },
          tools: [],
          process: { processName: 'P', drillDown: 1.5, ops: [] },
        },
        geometry: { id: 'g', bbox: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }, complexityHint: 1 },
        result: { backend: 'mock', summary: { bounds: [0, 0, 0], moves: 0, timeSec: 0 }, notes: [] },
      },
    ]
    localStorage.setItem('ws-cam-recent-runs', JSON.stringify(stored))
    const store = useCamStore()
    store.loadRecentRuns()
    expect(store.recentRuns[0]?.profile.process.camDrillDown).toBe(1.5)
    expect((store.recentRuns[0]?.profile.process as Record<string, unknown>).drillDown).toBeUndefined()
    const roundTrip = JSON.parse(localStorage.getItem('ws-cam-recent-runs')!) as CamRunSnapshot[]
    expect((roundTrip[0]!.profile.process as Record<string, unknown>).drillDown).toBeUndefined()
  })
})
