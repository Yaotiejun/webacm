import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FdmJobRecord } from './jobs'
import {
  deleteCarveraJob,
  deleteFdmJob,
  deleteGridBotJob,
  getCarveraJob,
  getFdmJob,
  getGridBotJob,
  listCarveraJobs,
  listFdmJobs,
  listGridBotJobs,
  saveCarveraJob,
  saveFdmJob,
  saveGridBotJob,
} from './jobs'

const FDM_KEY = 'ws-fdm-jobs'
const CARVERA_KEY = 'ws-carvera-jobs'
const GRIDBOT_KEY = 'ws-gridbot-jobs'

function minimalFdmJob(overrides: Partial<FdmJobRecord> = {}): FdmJobRecord {
  return {
    id: 'fdm-1',
    name: 'Test FDM',
    createdAt: 100,
    updatedAt: 100,
    mode: 'FDM',
    device: 'd',
    process: 'p',
    material: 'm',
    models: [],
    ...overrides,
  }
}

describe('api.jobs localStorage persistence', () => {
  beforeEach(() => {
    localStorage.removeItem(FDM_KEY)
    localStorage.removeItem(CARVERA_KEY)
    localStorage.removeItem(GRIDBOT_KEY)
  })

  afterEach(() => {
    localStorage.removeItem(FDM_KEY)
    localStorage.removeItem(CARVERA_KEY)
    localStorage.removeItem(GRIDBOT_KEY)
  })

  it('listFdmJobs returns empty array when storage is empty', async () => {
    expect(await listFdmJobs()).toEqual([])
  })

  it('saveFdmJob appends then listFdmJobs returns stored record with timestamps', async () => {
    const job = minimalFdmJob({ id: 'a', createdAt: 0 })
    await saveFdmJob(job)
    const list = await listFdmJobs()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe('a')
    expect(list[0]?.name).toBe('Test FDM')
    expect(list[0]?.createdAt).toBeGreaterThan(0)
    expect(list[0]?.updatedAt).toBeGreaterThan(0)
  })

  it('saveFdmJob updates existing id in place', async () => {
    await saveFdmJob(minimalFdmJob({ id: 'x', name: 'First' }))
    await saveFdmJob(minimalFdmJob({ id: 'x', name: 'Second' }))
    const list = await listFdmJobs()
    expect(list).toHaveLength(1)
    expect(list[0]?.name).toBe('Second')
  })

  it('getFdmJob returns null when missing', async () => {
    expect(await getFdmJob('missing')).toBeNull()
  })

  it('getFdmJob returns stored job', async () => {
    await saveFdmJob(minimalFdmJob({ id: 'g1' }))
    const got = await getFdmJob('g1')
    expect(got?.id).toBe('g1')
  })

  it('deleteFdmJob removes job', async () => {
    await saveFdmJob(minimalFdmJob({ id: 'd1' }))
    await deleteFdmJob('d1')
    expect(await listFdmJobs()).toEqual([])
  })

  it('listFdmJobs returns empty when JSON is invalid', async () => {
    localStorage.setItem(FDM_KEY, 'not-json')
    expect(await listFdmJobs()).toEqual([])
  })

  it('listFdmJobs returns empty when JSON parses to a non-array', async () => {
    localStorage.setItem(FDM_KEY, '{}')
    expect(await listFdmJobs()).toEqual([])
  })

  it('saveFdmJob round-trips slice migration fields', async () => {
    const job = minimalFdmJob({
      id: 'slice-meta-1',
      backend: 'kiri',
      sliceInputMeta: {
        vertexCount: 12,
        triangleCount: 2,
        planarBounds: { minX: 0, minY: 0, maxX: 2, maxY: 2 },
        zSpanMm: 1,
      },
      sliceLegacyDebug: {
        ready: true,
        initErrorMessage: null,
        hasSliceImpl: true,
        legacyImportErrorMessage: null,
      },
      currentDiagnosticsSnapshot: '; diag block\n; line2',
    })
    await saveFdmJob(job)
    const got = await getFdmJob('slice-meta-1')
    expect(got?.backend).toBe('kiri')
    expect(got?.sliceInputMeta?.vertexCount).toBe(12)
    expect(got?.sliceInputMeta?.triangleCount).toBe(2)
    expect(got?.sliceLegacyDebug?.hasSliceImpl).toBe(true)
    expect(got?.sliceLegacyDebug?.ready).toBe(true)
    expect(got?.currentDiagnosticsSnapshot).toContain('diag block')
  })

  it('saveFdmJob round-trips summary processSnapshot sliceTelemetryDigest jobBounds', async () => {
    const job = minimalFdmJob({
      id: 'fdm-rich-1',
      summary: { layers: 4, timeMinutes: 0.25, filamentMm: 88 },
      processSnapshot: { processName: 'snap-proc' } as FdmJobRecord['processSnapshot'],
      sliceTelemetryDigest: [
        {
          kind: 'slicer_fallback',
          code: 'slicer_legacy_slice_failed',
          reasonCode: 'legacy_slice_failed',
          message: 'digest-msg',
          ts: 9001,
        },
      ],
      jobBounds: {
        size: { x: 10, y: 10, z: 5 },
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 5 },
      },
    })
    await saveFdmJob(job)
    const got = await getFdmJob('fdm-rich-1')
    expect(got?.summary?.layers).toBe(4)
    expect(got?.summary?.filamentMm).toBe(88)
    expect((got?.processSnapshot as { processName?: string } | undefined)?.processName).toBe('snap-proc')
    expect(got?.sliceTelemetryDigest).toHaveLength(1)
    expect(got?.sliceTelemetryDigest?.[0]?.code).toBe('slicer_legacy_slice_failed')
    expect(got?.sliceTelemetryDigest?.[0]?.ts).toBe(9001)
    expect(got?.jobBounds?.max.z).toBe(5)
  })

  it('saveFdmJob round-trips summary.estimateMeta', async () => {
    const estimateMeta = {
      lengths: { perimeter: 1, infill: 2, support: 0, travelInLayer: 3, travelInterLayer: 4 },
      retract: { triggerDistance: 2, travelSegments: 5, interLayerSegments: 1, estimatedCount: 10 },
      timeSec: { print: 100, travel: 20, retract: 5, floor: 1, final: 126 },
    }
    await saveFdmJob(
      minimalFdmJob({
        id: 'fdm-est-meta-1',
        summary: { layers: 2, timeMinutes: 1, filamentMm: 50, estimateMeta },
      }),
    )
    const got = await getFdmJob('fdm-est-meta-1')
    expect(got?.summary?.estimateMeta?.timeSec.final).toBe(126)
    expect(got?.summary?.estimateMeta?.lengths.perimeter).toBe(1)
    expect(got?.summary?.estimateMeta?.retract.estimatedCount).toBe(10)
  })

  it('Carvera jobs round-trip save list get delete', async () => {
    await saveCarveraJob({ id: 'c1', name: 'C', createdAt: 1, updatedAt: 1 })
    expect(await listCarveraJobs()).toHaveLength(1)
    expect((await getCarveraJob('c1'))?.name).toBe('C')
    await deleteCarveraJob('c1')
    expect(await listCarveraJobs()).toEqual([])
  })

  it('saveCarveraJob bumps updatedAt on overwrite', async () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValueOnce(1000)
    await saveCarveraJob({ id: 'c1', name: 'C', createdAt: 10, updatedAt: 10 })
    expect((await getCarveraJob('c1'))?.updatedAt).toBe(1000)
    now.mockReturnValue(2000)
    await saveCarveraJob({ id: 'c1', name: 'C2', createdAt: 10, updatedAt: 10 })
    const j = await getCarveraJob('c1')
    expect(j?.name).toBe('C2')
    expect(j?.createdAt).toBe(10)
    expect(j?.updatedAt).toBe(2000)
    now.mockRestore()
  })

  it('listCarveraJobs returns empty when JSON parses to a non-array', async () => {
    localStorage.setItem(CARVERA_KEY, '{"oops":true}')
    expect(await listCarveraJobs()).toEqual([])
  })

  it('listCarveraJobs returns empty when JSON is invalid', async () => {
    localStorage.setItem(CARVERA_KEY, 'not-json')
    expect(await listCarveraJobs()).toEqual([])
  })

  it('listGridBotJobs returns empty when JSON parses to a non-array', async () => {
    localStorage.setItem(GRIDBOT_KEY, '{}')
    expect(await listGridBotJobs()).toEqual([])
  })

  it('listGridBotJobs returns empty when JSON is invalid', async () => {
    localStorage.setItem(GRIDBOT_KEY, 'not-json')
    expect(await listGridBotJobs()).toEqual([])
  })

  it('GridBot jobs round-trip save list get delete', async () => {
    await saveGridBotJob({ id: 'gb1', name: 'G', createdAt: 1, updatedAt: 1 })
    expect(await listGridBotJobs()).toHaveLength(1)
    expect((await getGridBotJob('gb1'))?.name).toBe('G')
    await deleteGridBotJob('gb1')
    expect(await listGridBotJobs()).toEqual([])
  })

  it('saveGridBotJob bumps updatedAt on overwrite', async () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValueOnce(3000)
    await saveGridBotJob({ id: 'gb1', name: 'G', createdAt: 20, updatedAt: 20 })
    expect((await getGridBotJob('gb1'))?.updatedAt).toBe(3000)
    now.mockReturnValue(4000)
    await saveGridBotJob({ id: 'gb1', name: 'G2', createdAt: 20, updatedAt: 20 })
    const j = await getGridBotJob('gb1')
    expect(j?.name).toBe('G2')
    expect(j?.createdAt).toBe(20)
    expect(j?.updatedAt).toBe(4000)
    now.mockRestore()
  })
})
