import { describe, expect, it } from 'vitest'
import { buildPlaceholderPerimeterLayers, estimateLayerCount, resolvePreviewLayers } from './previewPipeline'
import type { FdmProcess } from '@/types/process'

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
    sliceTopLayers: 2,
    sliceBottomLayers: 2,
    sliceShells: 2,
    sliceLineWidth: 0.4,
    sliceFillSparse: 0.2,
    sliceFillType: 'linear',
    sliceFillOverlap: 0.2,
    sliceSupportEnable: true,
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
  } as FdmProcess
}

describe('slicer.previewPipeline', () => {
  it('estimates layer count from model heights', () => {
    expect(estimateLayerCount(0.2, [10, 5], 1)).toBe(50)
  })

  it('builds placeholder perimeter layers', () => {
    const p = makeProcess()
    p.sliceShells = 3
    const layers = buildPlaceholderPerimeterLayers({ minX: 0, minY: 0, maxX: 10, maxY: 5 }, 0.5, 2, p)
    expect(layers.length).toBe(2)
    expect(layers[0]?.paths[0]?.type).toBe('perimeter')
    expect(layers[0]?.paths.filter((x) => x.type === 'perimeter').length).toBeGreaterThan(1)
    expect(layers[0]?.paths.some((p) => p.type === 'infill')).toBe(true)
    expect(layers[1]?.z).toBe(1)
  })

  it('alternates linear infill orientation between layers', () => {
    const p = makeProcess()
    p.sliceFillType = 'linear'
    const layers = buildPlaceholderPerimeterLayers({ minX: 0, minY: 0, maxX: 20, maxY: 20 }, 0.2, 2, p)
    const l0 = layers[0]?.paths.find((x) => x.type === 'infill')?.points
    const l1 = layers[1]?.paths.find((x) => x.type === 'infill')?.points
    expect(l0?.[0]?.[0]).toBe(l0?.[1]?.[0]) // vertical in layer 0
    expect(l1?.[0]?.[1]).toBe(l1?.[1]?.[1]) // horizontal in layer 1
  })

  it('alternates support orientation between layers', () => {
    const p = makeProcess()
    p.sliceSupportEnable = true
    const layers = buildPlaceholderPerimeterLayers({ minX: 0, minY: 0, maxX: 30, maxY: 30 }, 0.2, 2, p)
    const s0 = layers[0]?.paths.find((x) => x.type === 'support')?.points
    const s1 = layers[1]?.paths.find((x) => x.type === 'support')?.points
    expect(s0?.[0]?.[1]).toBe(s0?.[1]?.[1]) // horizontal in layer 0
    expect(s1?.[0]?.[0]).toBe(s1?.[1]?.[0]) // vertical in layer 1
  })

  it('builds travel links between generated print paths', () => {
    const p = makeProcess()
    p.outputRetractDist = 1
    const layers = buildPlaceholderPerimeterLayers({ minX: 0, minY: 0, maxX: 20, maxY: 20 }, 0.2, 1, p)
    const travel = layers[0]?.paths.filter((x) => x.type === 'travel') ?? []
    const infill = layers[0]?.paths.filter((x) => x.type === 'infill') ?? []
    expect(infill.length).toBeGreaterThan(0)
    expect(travel.length).toBeGreaterThan(0)
  })

  it('clips non-linear infill segments to inner shell bounds', () => {
    const p = makeProcess()
    p.sliceFillType = 'grid'
    p.sliceShells = 3
    const bounds = { minX: 0, minY: 0, maxX: 20, maxY: 10 }
    const layers = buildPlaceholderPerimeterLayers(bounds, 0.2, 1, p)
    const infill = layers[0]?.paths.filter((x) => x.type === 'infill') ?? []
    expect(infill.length).toBeGreaterThan(0)

    const shellInset = Math.max(0.2, p.sliceLineWidth * 0.5)
    const totalInset = shellInset * p.sliceShells
    const minX = bounds.minX + totalInset
    const maxX = bounds.maxX - totalInset
    const minY = bounds.minY + totalInset
    const maxY = bounds.maxY - totalInset

    for (const path of infill) {
      for (const [x, y] of path.points) {
        expect(x).toBeGreaterThanOrEqual(minX - 1e-6)
        expect(x).toBeLessThanOrEqual(maxX + 1e-6)
        expect(y).toBeGreaterThanOrEqual(minY - 1e-6)
        expect(y).toBeLessThanOrEqual(maxY + 1e-6)
      }
    }
  })

  it('prefers legacy preview when present', async () => {
    const legacy = { bounds: { minX: 1, minY: 2, maxX: 3, maxY: 4 }, layers: [{ z: 1, paths: [] }] }
    const out = await resolvePreviewLayers({
      legacyPreview: legacy,
      placeholderBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      layersCount: 2,
      layerHeight: 0.2,
      process: makeProcess(),
      legacyMode: 'auto',
      vertices: new Float32Array(),
      injectPerimeters: async (_v, l) => l,
    })
    expect(out.bounds.minX).toBe(1)
    expect(out.layers.length).toBe(1)
  })
})
