import type { SliceResult, SlicePreviewData, SliceLayerPreview, SlicePath2D, SliceInputMeta } from '@/api/slice'
import { computeVertexBounds3D, type VertexBounds3D } from '@/core/slicer/geometry'
import { estimateSummaryFromPreview, syncSliceSummaryTimeFromEstimateMeta } from '@/core/slicer/previewEstimate'
import type { SliceJobPayload } from '@/types/job'
import type { FdmProcess } from '@/types/process'

const DEFAULT_PLANAR_BOUNDS: SlicePreviewData['bounds'] = { minX: -50, minY: -50, maxX: 50, maxY: 50 }

function planarBoundsFromVertexBounds3D(b3: VertexBounds3D): SlicePreviewData['bounds'] {
  const { minX, minY, maxX, maxY } = b3
  if (maxX <= minX || maxY <= minY) {
    return { minX: minX - 50, minY: minY - 50, maxX: maxX + 50, maxY: maxY + 50 }
  }
  return { minX, minY, maxX, maxY }
}

export function resolvePlanarBoundsFromVertices(vertices: Float32Array): SlicePreviewData['bounds'] {
  const b3 = computeVertexBounds3D(vertices)
  if (!b3) return DEFAULT_PLANAR_BOUNDS
  return planarBoundsFromVertexBounds3D(b3)
}

export function resolveModelZSpanFromVertices(vertices: Float32Array): number {
  const b3 = computeVertexBounds3D(vertices)
  if (!b3) return 1
  return Math.max(1, b3.maxZ - b3.minZ)
}

export function withDerivedJobBounds(job: SliceJobPayload, vertices: Float32Array): SliceJobPayload {
  if (job.jobBounds) return job
  const b3 = computeVertexBounds3D(vertices)
  const b = !b3 ? DEFAULT_PLANAR_BOUNDS : planarBoundsFromVertexBounds3D(b3)
  const zSpan = !b3 ? 1 : Math.max(1, b3.maxZ - b3.minZ)
  return {
    ...job,
    jobBounds: {
      size: { x: b.maxX - b.minX, y: b.maxY - b.minY, z: zSpan },
      min: { x: b.minX, y: b.minY, z: 0 },
      max: { x: b.maxX, y: b.maxY, z: zSpan },
    },
  }
}

function buildMockPreview(bounds: SlicePreviewData['bounds'], proc: FdmProcess, layerCount: number): SlicePreviewData {
  const layers: SliceLayerPreview[] = []
  const rawDensity = proc.sliceFillSparse || 0
  const density = proc.sliceFillType === 'none' ? 0 : Math.max(0.01, rawDensity)
  const spanX = Math.max(1, bounds.maxX - bounds.minX)
  const spanY = Math.max(1, bounds.maxY - bounds.minY)
  const baseStep = Math.max(1, Math.min(spanX, spanY) * 0.15)
  const step = density ? Math.max(0.2, baseStep / density) : Infinity
  const layerHeight = proc.sliceHeight || 0.2

  for (let i = 0; i < layerCount; i++) {
    const z = layerHeight * (i + 1)
    const paths: SlicePath2D[] = []
    paths.push({
      type: 'perimeter',
      points: [
        [bounds.minX, bounds.minY],
        [bounds.maxX, bounds.minY],
        [bounds.maxX, bounds.maxY],
        [bounds.minX, bounds.maxY],
        [bounds.minX, bounds.minY],
      ],
    })
    const topLayers = Math.max(0, proc.sliceTopLayers || 0)
    const bottomLayers = Math.max(0, proc.sliceBottomLayers || 0)
    const isBottomSolid = i < bottomLayers
    const isTopSolid = i >= layerCount - topLayers
    const solidFactor = isBottomSolid || isTopSolid ? 0.25 : 1
    const effectiveStep = Math.max(0.2, step * solidFactor)

    if (proc.sliceFillType !== 'none') {
      const maxInfillSegments = 400
      let emitted = 0
      if (proc.sliceFillType === 'linear') {
        for (let x = bounds.minX; x <= bounds.maxX; x += effectiveStep) {
          if (emitted++ > maxInfillSegments) break
          paths.push({ type: 'infill', points: [[x, bounds.minY], [x, bounds.maxY]] })
        }
      } else {
        for (let x = bounds.minX; x <= bounds.maxX; x += effectiveStep) {
          if (emitted++ > maxInfillSegments) break
          paths.push({ type: 'infill', points: [[x, bounds.minY], [x + (bounds.maxY - bounds.minY), bounds.maxY]] })
        }
      }
    }
    if ((proc.outputRetractDist || 0) > 0) {
      const travelCount = proc.sliceFillType === 'none' ? 2 : 4
      for (let t = 0; t < travelCount; t++) {
        const x1 = bounds.minX + (t / travelCount) * (bounds.maxX - bounds.minX)
        const y1 = bounds.minY + ((t + 1) / (travelCount + 1)) * (bounds.maxY - bounds.minY)
        paths.push({ type: 'travel', points: [[x1, y1], [x1 + 10, y1 + 6]] })
      }
    }
    if (proc.sliceSupportEnable && i < 5) {
      const sDensity = Math.max(0.01, proc.sliceSupportDensity || 0)
      const suppStep = 30 / sDensity
      for (let y = bounds.minY; y <= bounds.maxY; y += suppStep) {
        paths.push({ type: 'support', points: [[bounds.minX, y], [bounds.maxX, y]] })
      }
    }
    layers.push({ z, paths })
  }

  return { bounds, layers }
}

/** Layer count for mock preview only; summary/time/filament/estimateMeta come from `estimateSummaryFromPreview` (same as Kiri path). */
function computeMockLayerCount(job: SliceJobPayload, proc: FdmProcess): number {
  const maxModelHeight = job.models.length > 0 ? Math.max(...job.models.map((m) => m.bbox.size.z)) : 20
  const layerHeight = Math.max(0.05, proc.sliceHeight || 0.2)
  const firstLayerH = Math.min(Math.max(0.05, proc.firstSliceHeight || layerHeight), Math.max(maxModelHeight, 1e-6))
  return maxModelHeight <= firstLayerH ? 1 : 1 + Math.ceil((maxModelHeight - firstLayerH) / layerHeight)
}

export function buildSliceInputMeta(vertices: Float32Array): SliceInputMeta {
  const b3 = computeVertexBounds3D(vertices)
  const planarBounds = !b3 ? DEFAULT_PLANAR_BOUNDS : planarBoundsFromVertexBounds3D(b3)
  const zSpanMm = !b3 ? 1 : Math.max(1, b3.maxZ - b3.minZ)
  const vertexCount = vertices.length
  const triangleCount = vertexCount > 0 && vertexCount % 9 === 0 ? vertexCount / 9 : Math.floor(vertexCount / 9)
  return { vertexCount, triangleCount, planarBounds, zSpanMm }
}

export function buildMockSliceResult(job: SliceJobPayload, proc: FdmProcess, vertices?: Float32Array): SliceResult {
  const layersCount = computeMockLayerCount(job, proc)
  const bounds = job.jobBounds
    ? { minX: job.jobBounds.min.x, minY: job.jobBounds.min.y, maxX: job.jobBounds.max.x, maxY: job.jobBounds.max.y }
    : DEFAULT_PLANAR_BOUNDS
  const preview = buildMockPreview(bounds, proc, layersCount)
  const summary = syncSliceSummaryTimeFromEstimateMeta(estimateSummaryFromPreview(preview.layers, proc))
  return { summary, preview, inputMeta: vertices?.length ? buildSliceInputMeta(vertices) : undefined, fallback: null }
}
