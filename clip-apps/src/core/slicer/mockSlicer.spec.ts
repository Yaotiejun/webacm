import { describe, expect, it } from 'vitest'
import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'
import {
  buildMockSliceResult,
  buildSliceInputMeta,
  resolveModelZSpanFromVertices,
  resolvePlanarBoundsFromVertices,
  withDerivedJobBounds,
} from './mockSlicer'
import { computeVertexBounds3D } from './geometry'

function makeJob(sizeX: number, sizeY: number, sizeZ: number): SliceJobPayload {
  return {
    id: 'job',
    name: 'job',
    createdAt: 1,
    updatedAt: 1,
    mode: 'FDM',
    device: 'd',
    process: 'p',
    material: 'm',
    models: [
      {
        id: 'm1',
        name: 'a.stl',
        ext: 'stl',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        bbox: {
          size: { x: sizeX, y: sizeY, z: sizeZ },
          min: { x: 0, y: 0, z: 0 },
          max: { x: sizeX, y: sizeY, z: sizeZ },
        },
      },
    ],
    jobBounds: {
      size: { x: sizeX, y: sizeY, z: sizeZ },
      min: { x: 0, y: 0, z: 0 },
      max: { x: sizeX, y: sizeY, z: sizeZ },
    },
  }
}

function makeProcess(): FdmProcess {
  return {
    processName: 'p',
    sliceHeight: 0.2,
    firstSliceHeight: 0.2,
    sliceShells: 2,
    sliceTopLayers: 3,
    sliceBottomLayers: 3,
    sliceLineWidth: 0.4,
    sliceFillType: 'linear',
    sliceFillSparse: 0.2,
    sliceFillOverlap: 0.2,
    sliceSupportEnable: false,
    sliceSupportDensity: 0.2,
    outputRetractDist: 0.8,
    outputRetractSpeed: 30,
    outputFeedrate: 60,
    outputSeekrate: 120,
    firstLayerRate: 20,
  } as FdmProcess
}

describe('slicer.mockSlicer', () => {
  it('resolves planar bounds from vertices', () => {
    const vertices = new Float32Array([-5, -3, 0, 10, 8, 1, 2, 4, 2])
    const out = resolvePlanarBoundsFromVertices(vertices)
    expect(out).toEqual({ minX: -5, minY: -3, maxX: 10, maxY: 8 })
  })

  it('resolvePlanarBoundsFromVertices matches XY projection of computeVertexBounds3D', () => {
    const vertices = new Float32Array([1, 2, 3, 4, 5, 6, 0, 0, 0])
    const b3 = computeVertexBounds3D(vertices)
    const planar = resolvePlanarBoundsFromVertices(vertices)
    expect(b3).not.toBeNull()
    expect(planar).toEqual({ minX: b3!.minX, minY: b3!.minY, maxX: b3!.maxX, maxY: b3!.maxY })
  })

  it('uses default planar bounds when vertices are empty or non-finite', () => {
    expect(resolvePlanarBoundsFromVertices(new Float32Array(0))).toEqual({
      minX: -50,
      minY: -50,
      maxX: 50,
      maxY: 50,
    })
  })

  it('resolves model z span from vertices', () => {
    const vertices = new Float32Array([0, 0, -2, 1, 1, 5, 2, 2, 3])
    expect(resolveModelZSpanFromVertices(vertices)).toBe(7)
  })

  it('returns minimum z span when vertices lack finite Z samples', () => {
    expect(resolveModelZSpanFromVertices(new Float32Array(0))).toBe(1)
  })

  it('derives missing job bounds from vertices', () => {
    const job = makeJob(10, 10, 5)
    delete (job as { jobBounds?: SliceJobPayload['jobBounds'] }).jobBounds
    const vertices = new Float32Array([0, 0, 0, 20, 10, 4, 5, -5, 2])
    const out = withDerivedJobBounds(job, vertices)
    expect(out.jobBounds?.min.x).toBe(0)
    expect(out.jobBounds?.max.x).toBe(20)
    expect(out.jobBounds?.min.y).toBe(-5)
    expect(out.jobBounds?.max.y).toBe(10)
    expect(out.jobBounds?.size.z).toBe(4)
  })

  it('withDerivedJobBounds returns same job reference when jobBounds already set', () => {
    const job = makeJob(10, 10, 5)
    const vertices = new Float32Array([99, 99, 99])
    const out = withDerivedJobBounds(job, vertices)
    expect(out).toBe(job)
  })

  it('produces geometry-aware summary differences', () => {
    const proc = makeProcess()
    const small = buildMockSliceResult(makeJob(20, 20, 10), proc)
    const large = buildMockSliceResult(makeJob(80, 80, 10), proc)
    expect(large.summary.timeMinutes).toBeGreaterThan(small.summary.timeMinutes)
    expect(large.summary.filamentMm).toBeGreaterThan(small.summary.filamentMm)
  })

  it('reduces mock layer count when firstSliceHeight consumes more of model height', () => {
    const job = makeJob(30, 30, 9)
    const thinFirst = { ...makeProcess(), firstSliceHeight: 0.2, sliceHeight: 0.2 } as FdmProcess
    const thickFirst = { ...makeProcess(), firstSliceHeight: 2, sliceHeight: 0.2 } as FdmProcess
    const a = buildMockSliceResult(job, thinFirst)
    const b = buildMockSliceResult(job, thickFirst)
    expect(b.summary.layers).toBeLessThan(a.summary.layers)
  })

  it('buildSliceInputMeta counts triangles and bounds', () => {
    const verts = new Float32Array([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 1, 5, 0, 1, 0, 5, 1])
    const meta = buildSliceInputMeta(verts)
    expect(meta.vertexCount).toBe(18)
    expect(meta.triangleCount).toBe(2)
    expect(meta.zSpanMm).toBe(1)
  })

  it('buildSliceInputMeta matches planar bounds and z span from resolve helpers', () => {
    const verts = new Float32Array([2, 3, 4, 9, 3, 11])
    const meta = buildSliceInputMeta(verts)
    expect(meta.planarBounds).toEqual(resolvePlanarBoundsFromVertices(verts))
    expect(meta.zSpanMm).toBe(resolveModelZSpanFromVertices(verts))
  })

  it('buildMockSliceResult includes estimateMeta aligned with Kiri path (preview-based estimator)', () => {
    const r = buildMockSliceResult(makeJob(20, 20, 10), makeProcess())
    expect(r.summary.estimateMeta).toBeTruthy()
    expect(r.summary.estimateMeta!.lengths.perimeter).toBeGreaterThan(0)
    expect(r.summary.timeMinutes).toBeCloseTo(r.summary.estimateMeta!.timeSec.final / 60, 10)
    expect(r.summary.layers).toBe(r.preview.layers.length)
  })

  it('buildMockSliceResult attaches inputMeta when vertices are passed', () => {
    const verts = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const r = buildMockSliceResult(makeJob(10, 10, 10), makeProcess(), verts)
    expect(r.inputMeta?.triangleCount).toBe(1)
    expect(r.inputMeta?.planarBounds.minX).toBe(0)
  })
})
