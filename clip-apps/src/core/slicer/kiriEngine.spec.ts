import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  runtimeState,
  runWithLegacySliceGuardMock,
  loadLegacyFdmRuntimeMock,
  resolvePreviewLayersMock,
  estimateSummaryFromPreviewMock,
} = vi.hoisted(() => ({
  runtimeState: {
    ready: true,
    initError: null as Error | null,
    initPromise: null as Promise<void> | null,
    fdmSliceImpl: (() => {}) as any,
    fakeDeviceProfile: null,
    fakeControllerProfile: null,
    legacySliceRunning: false,
    lastLegacyFdmImportError: null as string | null,
  },
  runWithLegacySliceGuardMock: vi.fn(async (_run: () => Promise<any>): Promise<any> => null),
  loadLegacyFdmRuntimeMock: vi.fn(async () => {}),
  resolvePreviewLayersMock: vi.fn(async () => ({
    bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    layers: [],
  })),
  estimateSummaryFromPreviewMock: vi.fn(() => ({ filamentMm: 0, filamentG: 0, printTimeSec: 0 })),
}))

vi.mock('@/core/slicer/kiriRuntimeState', () => ({
  bindLegacyImpl: vi.fn(),
  clearLegacyImplBindings: vi.fn(),
  getKiriRuntimeState: () => runtimeState,
  runWithLegacySliceGuard: runWithLegacySliceGuardMock,
}))

vi.mock('@/core/slicer/kiriRuntimeLoader', () => ({
  loadLegacyFdmRuntime: loadLegacyFdmRuntimeMock,
}))

vi.mock('@/core/slicer/previewPipeline', () => ({
  estimateLayerCount: vi.fn(() => 1),
  resolvePreviewLayers: resolvePreviewLayersMock,
}))

vi.mock('@/core/slicer/previewEstimate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/slicer/previewEstimate')>()
  return {
    ...actual,
    estimateSummaryFromPreview: estimateSummaryFromPreviewMock,
  }
})

vi.mock('@/core/slicer/kiriSettingsAdapter', () => ({
  buildKiriSettingsPayload: vi.fn(() => ({})),
}))

vi.mock('@/core/slicer/geometry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/slicer/geometry')>()
  return {
    ...actual,
    pointsFromVertices: vi.fn(() => []),
  }
})

vi.mock('@/core/slicer/previewConvert', () => ({
  convertWidgetSlicesToLayers: vi.fn(() => []),
  polyToPath: vi.fn(() => null),
}))

vi.mock('@/core/slicer/kiriLegacyBridge', () => ({
  runLegacyFdmSliceBridge: vi.fn(),
}))

import { sliceWithKiri } from './kiriEngine'
import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'

function makeJob(): SliceJobPayload {
  return {
    id: 'j1',
    name: 'job',
    createdAt: 1,
    updatedAt: 1,
    mode: 'FDM',
    device: 'd1',
    process: 'p1',
    material: 'm1',
    models: [
      {
        id: 'm1',
        name: 'model',
        ext: 'stl',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        bbox: {
          size: { x: 1, y: 1, z: 1 },
          min: { x: 0, y: 0, z: 0 },
          max: { x: 1, y: 1, z: 1 },
        },
      },
    ],
  }
}

function makeProcess(): FdmProcess {
  return {
    processName: 'p',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 210,
    firstLayerBedTemp: 60,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    sliceSupportOffset: 0.2,
    sliceSupportSize: 1,
    sliceSupportAngle: 55,
    outputRetractDist: 0.8,
    outputRetractSpeed: 30,
    outputFanSpeed: 100,
    outputFanLayer: 2,
    outputMinLayerTime: 5,
    zHopDistance: 0.2,
  }
}

describe('slicer.kiriEngine fallback tri-state', () => {
  const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])

  beforeEach(() => {
    runtimeState.ready = true
    runtimeState.initError = null
    runtimeState.fdmSliceImpl = () => {}
    runtimeState.lastLegacyFdmImportError = null
    runWithLegacySliceGuardMock.mockReset()
    runWithLegacySliceGuardMock.mockResolvedValue(null)
    loadLegacyFdmRuntimeMock.mockClear()
    resolvePreviewLayersMock.mockClear()
    estimateSummaryFromPreviewMock.mockClear()
  })

  it('returns skip fallback when runtime gate cannot run legacy', async () => {
    runtimeState.fdmSliceImpl = null
    const out = await sliceWithKiri(makeJob(), vertices, makeProcess())
    expect(out.fallback?.reasonCode).toBe('legacy_impl_missing')
    expect(out.legacyDebug).toEqual(
      expect.objectContaining({
        ready: true,
        hasSliceImpl: false,
        initErrorMessage: null,
        legacyImportErrorMessage: null,
      }),
    )
    expect(runWithLegacySliceGuardMock).not.toHaveBeenCalled()
  })

  it('appends legacy import error to fallback message when present', async () => {
    runtimeState.fdmSliceImpl = null
    runtimeState.lastLegacyFdmImportError = 'failed to fetch dynamically imported module'
    const out = await sliceWithKiri(makeJob(), vertices, makeProcess())
    expect(out.fallback?.reasonCode).toBe('legacy_impl_missing')
    expect(out.fallback?.message).toContain('failed to fetch dynamically imported module')
    expect(out.fallback?.message).toContain(' — import: ')
  })

  it.each([
    {
      name: 'maps timeout failure to timeout reason code',
      error: new Error('legacy slice timeout after 500ms'),
      reasonCode: 'legacy_slice_timeout',
    },
    {
      name: 'maps reentry failure to reentry reason code',
      error: new Error('legacy slice already running'),
      reasonCode: 'legacy_slice_reentry',
    },
  ])('$name', async ({ error, reasonCode }) => {
    runWithLegacySliceGuardMock.mockRejectedValueOnce(error)
    const out = await sliceWithKiri(makeJob(), vertices, makeProcess())
    expect(out.fallback?.reasonCode).toBe(reasonCode)
  })

  it('returns null fallback when legacy run succeeds', async () => {
    runWithLegacySliceGuardMock.mockResolvedValueOnce({
      bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      layers: [{ z: 0.2, paths: [] }],
    })
    const out = await sliceWithKiri(makeJob(), vertices, makeProcess())
    expect(out.fallback).toBeNull()
    expect(out.legacyDebug?.hasSliceImpl).toBe(true)
  })

  it('passes vertex-derived placeholderBounds when legacy is skipped', async () => {
    runtimeState.fdmSliceImpl = null
    const v = new Float32Array([0, 0, 0, 5, 0, 0, 5, 3, 0])
    await sliceWithKiri(makeJob(), v, makeProcess())
    const arg = resolvePreviewLayersMock.mock.calls[0]?.[0]
    expect(arg?.placeholderBounds).toEqual({ minX: 0, minY: 0, maxX: 5, maxY: 3 })
  })
})
