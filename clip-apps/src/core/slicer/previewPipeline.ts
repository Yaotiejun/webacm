import type { SliceLayerPreview } from '@/api/slice'
import type { FdmProcess } from '@/types/process'

export interface PreviewBounds2D {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface LegacyPreviewData {
  bounds: PreviewBounds2D
  layers: SliceLayerPreview[]
}

export function estimateLayerCount(layerHeight: number, modelHeights: number[], zSpanFallback: number): number {
  const safeLayerHeight = Number.isFinite(layerHeight) && layerHeight > 0 ? layerHeight : 0.2
  const maxModelHeight = modelHeights.length > 0 ? Math.max(...modelHeights) : Math.max(1, zSpanFallback || 20)
  return Math.max(1, Math.round(maxModelHeight / safeLayerHeight))
}

export function buildPlaceholderPerimeterLayers(
  bounds: PreviewBounds2D,
  layerHeight: number,
  layersCount: number,
  process: FdmProcess,
): SliceLayerPreview[] {
  const clipSegmentToRect = (
    p0: [number, number],
    p1: [number, number],
    rect: { minX: number; minY: number; maxX: number; maxY: number },
  ): [[number, number], [number, number]] | null => {
    let t0 = 0
    let t1 = 1
    const dx = p1[0] - p0[0]
    const dy = p1[1] - p0[1]
    const accept = (p: number, q: number): boolean => {
      if (p === 0) return q >= 0
      const r = q / p
      if (p < 0) {
        if (r > t1) return false
        if (r > t0) t0 = r
      } else {
        if (r < t0) return false
        if (r < t1) t1 = r
      }
      return true
    }
    if (
      !accept(-dx, p0[0] - rect.minX) ||
      !accept(dx, rect.maxX - p0[0]) ||
      !accept(-dy, p0[1] - rect.minY) ||
      !accept(dy, rect.maxY - p0[1])
    ) {
      return null
    }
    const a: [number, number] = [p0[0] + t0 * dx, p0[1] + t0 * dy]
    const b: [number, number] = [p0[0] + t1 * dx, p0[1] + t1 * dy]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= 1e-6) return null
    return [a, b]
  }

  const travelLinksFrom = (paths: SliceLayerPreview['paths']): SliceLayerPreview['paths'] => {
    const links: SliceLayerPreview['paths'] = []
    let prevEnd: [number, number] | null = null
    for (const p of paths) {
      if (p.type !== 'infill' && p.type !== 'support') continue
      const first = p.points[0]
      const last = p.points[p.points.length - 1]
      if (!first || !last) continue
      if (prevEnd) {
        const dx = first[0] - prevEnd[0]
        const dy = first[1] - prevEnd[1]
        if (Math.hypot(dx, dy) > 0.001) {
          links.push({ type: 'travel', points: [prevEnd, first] })
        }
      }
      prevEnd = last
    }
    return links
  }

  const safeLayerHeight = Number.isFinite(layerHeight) && layerHeight > 0 ? layerHeight : 0.2
  const rawDensity = process.sliceFillSparse || 0
  const density = process.sliceFillType === 'none' ? 0 : Math.max(0.01, rawDensity)
  const shellCount = Math.max(1, Math.round(process.sliceShells || 1))
  const shellInsetStep = Math.max(0.1, Number(process.sliceLineWidth || 0.4))
  const spanX = Math.max(1, bounds.maxX - bounds.minX)
  const spanY = Math.max(1, bounds.maxY - bounds.minY)
  const baseStep = Math.max(1, Math.min(spanX, spanY) * 0.15)
  const step = density ? Math.max(0.2, baseStep / density) : Infinity
  return Array.from({ length: layersCount }, (_, i) => {
    const z = safeLayerHeight * (i + 1)
    const paths: SliceLayerPreview['paths'] = []

    let innerMinX = bounds.minX
    let innerMinY = bounds.minY
    let innerMaxX = bounds.maxX
    let innerMaxY = bounds.maxY
    for (let s = 0; s < shellCount; s++) {
      if (innerMaxX <= innerMinX || innerMaxY <= innerMinY) break
      paths.push({
        type: 'perimeter',
        points: [
          [innerMinX, innerMinY],
          [innerMaxX, innerMinY],
          [innerMaxX, innerMaxY],
          [innerMinX, innerMaxY],
          [innerMinX, innerMinY],
        ],
      })
      innerMinX += shellInsetStep
      innerMinY += shellInsetStep
      innerMaxX -= shellInsetStep
      innerMaxY -= shellInsetStep
    }

    const infillMinX = innerMinX
    const infillMinY = innerMinY
    const infillMaxX = innerMaxX
    const infillMaxY = innerMaxY

    const topLayers = Math.max(0, process.sliceTopLayers || 0)
    const bottomLayers = Math.max(0, process.sliceBottomLayers || 0)
    const isBottomSolid = i < bottomLayers
    const isTopSolid = i >= layersCount - topLayers
    const solidFactor = isBottomSolid || isTopSolid ? 0.25 : 1
    const effectiveStep = Math.max(0.2, step * solidFactor)

    if (process.sliceFillType !== 'none' && infillMaxX > infillMinX && infillMaxY > infillMinY) {
      const maxInfillSegments = 400
      let emitted = 0
      const infillRect = { minX: infillMinX, minY: infillMinY, maxX: infillMaxX, maxY: infillMaxY }
      if (process.sliceFillType === 'linear') {
        const alternateAxis = i % 2 === 1
        if (!alternateAxis) {
          for (let x = infillMinX; x <= infillMaxX; x += effectiveStep) {
            if (emitted++ > maxInfillSegments) break
            paths.push({ type: 'infill', points: [[x, infillMinY], [x, infillMaxY]] })
          }
        } else {
          for (let y = infillMinY; y <= infillMaxY; y += effectiveStep) {
            if (emitted++ > maxInfillSegments) break
            paths.push({ type: 'infill', points: [[infillMinX, y], [infillMaxX, y]] })
          }
        }
      } else {
        const span = infillMaxY - infillMinY
        const reverse = i % 2 === 1
        if (!reverse) {
          for (let x = infillMinX - span; x <= infillMaxX; x += effectiveStep) {
            if (emitted++ > maxInfillSegments) break
            const clipped = clipSegmentToRect([x, infillMinY], [x + span, infillMaxY], infillRect)
            if (clipped) paths.push({ type: 'infill', points: clipped })
          }
        } else {
          for (let x = infillMaxX + span; x >= infillMinX; x -= effectiveStep) {
            if (emitted++ > maxInfillSegments) break
            const clipped = clipSegmentToRect([x, infillMinY], [x - span, infillMaxY], infillRect)
            if (clipped) paths.push({ type: 'infill', points: clipped })
          }
        }
      }
    }

    if ((process.outputRetractDist || 0) > 0) {
      const links = travelLinksFrom(paths)
      if (links.length > 0) {
        paths.push(...links)
      } else {
        const travelCount = process.sliceFillType === 'none' ? 2 : 4
        for (let t = 0; t < travelCount; t++) {
          const x1 = bounds.minX + (t / travelCount) * (bounds.maxX - bounds.minX)
          const y1 = bounds.minY + ((t + 1) / (travelCount + 1)) * (bounds.maxY - bounds.minY)
          paths.push({ type: 'travel', points: [[x1, y1], [x1 + 10, y1 + 6]] })
        }
      }
    }

    if (process.sliceSupportEnable && i < 5) {
      const sDensity = Math.max(0.01, process.sliceSupportDensity || 0)
      const suppStep = 30 / sDensity
      const supportAlternateAxis = i % 2 === 1
      const supportPhase = (i % 3) * (suppStep / 3)
      if (!supportAlternateAxis) {
        for (let y = bounds.minY + supportPhase; y <= bounds.maxY; y += suppStep) {
          paths.push({ type: 'support', points: [[bounds.minX, y], [bounds.maxX, y]] })
        }
      } else {
        for (let x = bounds.minX + supportPhase; x <= bounds.maxX; x += suppStep) {
          paths.push({ type: 'support', points: [[x, bounds.minY], [x, bounds.maxY]] })
        }
      }
    }

    return {
      z,
      paths,
    }
  })
}

export async function resolvePreviewLayers(input: {
  legacyPreview: LegacyPreviewData | null
  placeholderBounds: PreviewBounds2D
  layersCount: number
  layerHeight: number
  process: FdmProcess
  legacyMode: string
  vertices: Float32Array
  injectPerimeters: (vertices: Float32Array, layers: SliceLayerPreview[]) => Promise<SliceLayerPreview[]>
}): Promise<{ bounds: PreviewBounds2D; layers: SliceLayerPreview[] }> {
  const { legacyPreview, placeholderBounds, layersCount, layerHeight, process, legacyMode, vertices, injectPerimeters } = input
  if (legacyPreview && legacyPreview.layers.length) {
    return { bounds: legacyPreview.bounds, layers: legacyPreview.layers }
  }
  const baseLayers = buildPlaceholderPerimeterLayers(placeholderBounds, layerHeight, layersCount, process)
  if (legacyMode === '0') {
    return { bounds: placeholderBounds, layers: baseLayers }
  }
  try {
    const layers = await injectPerimeters(vertices, baseLayers)
    return { bounds: placeholderBounds, layers }
  } catch {
    return { bounds: placeholderBounds, layers: baseLayers }
  }
}
