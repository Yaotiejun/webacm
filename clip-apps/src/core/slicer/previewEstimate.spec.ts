import { describe, expect, it } from 'vitest'
import type { FdmProcess } from '@/types/process'
import type { SliceLayerPreview } from '@/api/slice'
import { estimateSummaryFromPreview, syncSliceSummaryTimeFromEstimateMeta } from './previewEstimate'

function makeProcess(): FdmProcess {
  return {
    processName: 'p',
    outputTemp: 210,
    outputBedTemp: 60,
    firstLayerNozzleTemp: 215,
    firstLayerBedTemp: 65,
    outputFeedrate: 50,
    outputSeekrate: 120,
    firstLayerRate: 20,
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceTopLayers: 3,
    sliceBottomLayers: 3,
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
    outputMinLayerTime: 0,
    zHopDistance: 0.2,
  } as FdmProcess
}

describe('slicer.previewEstimate', () => {
  it('estimates non-zero summary from preview paths', () => {
    const out = estimateSummaryFromPreview(
      [
        {
          z: 0.2,
          paths: [
            { type: 'perimeter', points: [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]] },
            { type: 'infill', points: [[0, 0], [10, 10]] },
          ],
        },
      ],
      makeProcess(),
    )
    expect(out.layers).toBe(1)
    expect(out.timeMinutes).toBeGreaterThan(0)
    expect(out.filamentMm).toBeGreaterThan(0)
    expect(out.estimateMeta?.lengths.perimeter).toBeGreaterThan(0)
    expect(out.estimateMeta?.timeSec.final).toBeGreaterThan(0)
  })

  it('scales estimate with path length', () => {
    const proc = makeProcess()
    const short = estimateSummaryFromPreview([{ z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] }], proc)
    const long = estimateSummaryFromPreview([{ z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [100, 0]] }] }], proc)
    expect(long.timeMinutes).toBeGreaterThan(short.timeMinutes)
    expect(long.filamentMm).toBeGreaterThan(short.filamentMm)
  })

  it('applies extrusion multipliers to filament estimate', () => {
    const base = makeProcess()
    const high = makeProcess()
    high.outputShellMult = 2
    const layers: SliceLayerPreview[] = [{ z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [100, 0]] }] }]
    const a = estimateSummaryFromPreview(layers, base)
    const b = estimateSummaryFromPreview(layers, high)
    expect(b.filamentMm).toBeGreaterThan(a.filamentMm)
  })

  it('includes min layer time floor', () => {
    const proc = makeProcess()
    proc.outputMinLayerTime = 30
    const out = estimateSummaryFromPreview([{ z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [1, 0]] }] }], proc)
    expect(out.timeMinutes).toBeGreaterThanOrEqual(0.5)
  })

  it('applies firstLayerRate to print moves in the firstSliceHeight band (bottom-up)', () => {
    const fastFirst = { ...makeProcess(), firstLayerRate: 40, outputFeedrate: 40 }
    const slowFirst = { ...makeProcess(), firstLayerRate: 8, outputFeedrate: 40 }
    const layers: SliceLayerPreview[] = [
      {
        z: 0.2,
        paths: [{ type: 'perimeter', points: [[0, 0], [40, 0], [40, 1], [0, 1], [0, 0]] }],
      },
      {
        z: 0.4,
        paths: [{ type: 'perimeter', points: [[0, 0], [10, 0], [10, 1], [0, 1], [0, 0]] }],
      },
    ]
    const a = estimateSummaryFromPreview(layers, fastFirst as FdmProcess)
    const b = estimateSummaryFromPreview(layers, slowFirst as FdmProcess)
    expect(b.timeMinutes).toBeGreaterThan(a.timeMinutes)
    expect(b.estimateMeta?.timeSec.print).toBeGreaterThan(a.estimateMeta?.timeSec.print ?? 0)
  })

  it('extends slow first-layer feed when firstSliceHeight spans multiple slice planes', () => {
    const procThin = { ...makeProcess(), firstSliceHeight: 0.2, sliceHeight: 0.2, firstLayerRate: 10, outputFeedrate: 50 }
    const procThick = { ...makeProcess(), firstSliceHeight: 0.6, sliceHeight: 0.2, firstLayerRate: 10, outputFeedrate: 50 }
    const layers: SliceLayerPreview[] = [
      { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [20, 0], [20, 1], [0, 1], [0, 0]] }] },
      { z: 0.4, paths: [{ type: 'perimeter', points: [[0, 0], [20, 0], [20, 1], [0, 1], [0, 0]] }] },
      { z: 0.6, paths: [{ type: 'perimeter', points: [[0, 0], [20, 0], [20, 1], [0, 1], [0, 0]] }] },
      { z: 0.8, paths: [{ type: 'perimeter', points: [[0, 0], [5, 0], [5, 1], [0, 1], [0, 0]] }] },
    ]
    const a = estimateSummaryFromPreview(layers, procThin as FdmProcess)
    const b = estimateSummaryFromPreview(layers, procThick as FdmProcess)
    expect(b.estimateMeta?.timeSec.print).toBeGreaterThan(a.estimateMeta?.timeSec.print ?? 0)
  })

  it('sorts layers by z so estimates are stable when preview layer order varies', () => {
    const proc = makeProcess()
    const shuffled = estimateSummaryFromPreview(
      [
        { z: 0.4, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
        { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
      ],
      proc,
    )
    const ordered = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
        { z: 0.4, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
      ],
      proc,
    )
    expect(shuffled.timeMinutes).toBeCloseTo(ordered.timeMinutes, 5)
    expect(shuffled.estimateMeta?.timeSec.final).toBeCloseTo(ordered.estimateMeta?.timeSec.final ?? 0, 5)
  })

  it('caps travel seek speed in the firstSliceHeight band using firstLayerRate', () => {
    const proc = makeProcess()
    proc.outputSeekrate = 200
    proc.outputFeedrate = 50
    proc.firstLayerRate = 8
    proc.firstSliceHeight = 0.35
    proc.sliceHeight = 0.2
    const layers: SliceLayerPreview[] = [
      {
        z: 0.2,
        paths: [
          { type: 'perimeter', points: [[0, 0], [5, 0], [5, 1], [0, 1], [0, 0]] },
          { type: 'travel', points: [[0, 0], [40, 30]] },
        ],
      },
      { z: 0.4, paths: [{ type: 'travel', points: [[0, 0], [40, 30]] }] },
    ]
    const capped = estimateSummaryFromPreview(layers, proc)
    const procFastFirst = { ...proc, firstLayerRate: 200 }
    const uncapped = estimateSummaryFromPreview(layers, procFastFirst as FdmProcess)
    expect(capped.estimateMeta?.timeSec.travel).toBeGreaterThan(uncapped.estimateMeta?.timeSec.travel ?? 0)
  })

  it('adds Z-hop time between layers when zHopDistance is set', () => {
    const proc = makeProcess()
    const noHop = { ...proc, zHopDistance: 0 }
    const withHop = { ...proc, zHopDistance: 0.6, outputRetractSpeed: 30 }
    const layers: SliceLayerPreview[] = [
      { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [3, 0], [3, 1], [0, 1], [0, 0]] }] },
      { z: 0.4, paths: [{ type: 'perimeter', points: [[0, 0], [3, 0], [3, 1], [0, 1], [0, 0]] }] },
    ]
    const a = estimateSummaryFromPreview(layers, noHop as FdmProcess)
    const b = estimateSummaryFromPreview(layers, withHop as FdmProcess)
    expect(b.estimateMeta!.timeSec.final).toBeGreaterThan(a.estimateMeta!.timeSec.final)
  })

  it('uses summed preview layer Δz for Z advance time (variable layer height)', () => {
    /** Wide first-slice band so every layer uses the same print-feed branch; delta is Z-axis time only. */
    const proc = { ...makeProcess(), firstSliceHeight: 3, sliceHeight: 0.2 } as FdmProcess
    const path = [{ type: 'perimeter' as const, points: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]] }]
    const uniform = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: path },
        { z: 0.4, paths: path },
        { z: 0.6, paths: path },
      ],
      proc,
    )
    const thickStep = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: path },
        { z: 0.5, paths: path },
        { z: 0.9, paths: path },
      ],
      proc,
    )
    expect(thickStep.estimateMeta!.timeSec.final).toBeGreaterThan(uniform.estimateMeta!.timeSec.final)
  })

  it('adds layer-to-layer Z advance time for multi-layer previews', () => {
    const proc = makeProcess()
    const path = [{ type: 'perimeter' as const, points: [[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]] }]
    const one = estimateSummaryFromPreview([{ z: 0.2, paths: path }], proc)
    const three = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: path },
        { z: 0.4, paths: path },
        { z: 0.6, paths: path },
      ],
      proc,
    )
    expect(three.estimateMeta!.timeSec.final).toBeGreaterThan(one.estimateMeta!.timeSec.final)
  })

  it('includes inter-layer travel in time estimate', () => {
    const proc = makeProcess()
    proc.outputMinLayerTime = 0
    const close = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
        { z: 0.4, paths: [{ type: 'perimeter', points: [[10, 0], [20, 0]] }] },
      ],
      proc,
    )
    const far = estimateSummaryFromPreview(
      [
        { z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [10, 0]] }] },
        { z: 0.4, paths: [{ type: 'perimeter', points: [[100, 100], [110, 100]] }] },
      ],
      proc,
    )
    expect(far.timeMinutes).toBeGreaterThan(close.timeMinutes)
  })

  it('syncSliceSummaryTimeFromEstimateMeta aligns timeMinutes with estimateMeta.final', () => {
    const proc = makeProcess()
    const base = estimateSummaryFromPreview(
      [{ z: 0.2, paths: [{ type: 'perimeter', points: [[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]] }] }],
      proc,
    )
    expect(base.estimateMeta).toBeTruthy()
    const patched = { ...base, timeMinutes: 999 }
    const synced = syncSliceSummaryTimeFromEstimateMeta(patched)
    expect(synced.timeMinutes).toBeCloseTo((base.estimateMeta!.timeSec.final / 60) as number, 10)
  })

  it('returns finite summary for empty preview layers', () => {
    const out = estimateSummaryFromPreview([], makeProcess())
    expect(out.layers).toBe(0)
    expect(out.filamentMm).toBe(0)
    expect(Number.isFinite(out.timeMinutes)).toBe(true)
    expect(out.timeMinutes).toBeGreaterThanOrEqual(0)
  })

  it('syncSliceSummaryTimeFromEstimateMeta is identity when estimateMeta is absent', () => {
    const summary = { layers: 2, timeMinutes: 12.5, filamentMm: 100 }
    expect(syncSliceSummaryTimeFromEstimateMeta(summary)).toEqual(summary)
  })
})
