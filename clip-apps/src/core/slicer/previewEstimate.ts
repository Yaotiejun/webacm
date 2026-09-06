import type { SliceLayerPreview, SliceResultSummary } from '@/api/slice'
import type { FdmProcess } from '@/types/process'

function segmentLength(a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return Math.hypot(dx, dy)
}

function pathLength(path: Array<[number, number]>): number {
  if (path.length < 2) return 0
  let len = 0
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1]
    const cur = path[i]
    if (!prev || !cur) continue
    len += segmentLength(prev, cur)
  }
  return len
}

export function estimateSummaryFromPreview(layers: SliceLayerPreview[], process: FdmProcess): SliceResultSummary {
  const ordered = [...layers].sort((a, b) => a.z - b.z)
  const layerCount = ordered.length

  let perimeterLen = 0
  let infillLen = 0
  let supportLen = 0
  let travelLen = 0
  let interLayerTravelLen = 0
  let travelSegmentCount = 0
  let interLayerTravelSegmentCount = 0
  let prevLayerEnd: [number, number] | null = null

  const basePrintFeed = Math.max(1, Number(process.outputFeedrate || 50)) // mm/s
  const travelFeed = Math.max(basePrintFeed, Number(process.outputSeekrate || basePrintFeed))
  const firstLayerPrintFeed = Math.max(1, Number(process.firstLayerRate || basePrintFeed))
  const sliceH = Math.max(0.05, Number(process.sliceHeight || 0.2))
  const firstSliceH = Math.max(sliceH, Number(process.firstSliceHeight || sliceH))
  const zBottom = ordered[0]?.z ?? 0
  const firstBandTop = zBottom + firstSliceH + 1e-6

  let printTimeSec = 0
  let travelTimeSec = 0

  for (let layerIdx = 0; layerIdx < ordered.length; layerIdx++) {
    const layer = ordered[layerIdx]!
    const useSlowFirstFeed = layer.z <= firstBandTop
    const printFeed = useSlowFirstFeed ? firstLayerPrintFeed : basePrintFeed
    const perimeterFeed = Math.max(1, printFeed * 0.85)
    const infillFeed = printFeed
    const supportFeed = Math.max(1, printFeed * 0.75)
    /** First-layer band: cap rapids so XY moves align with conservative first-layer kinematics. */
    const layerTravelFeed = Math.max(1, useSlowFirstFeed ? Math.min(travelFeed, firstLayerPrintFeed * 1.25) : travelFeed)

    let firstPrintPoint: [number, number] | null = null
    let lastPrintPoint: [number, number] | null = null
    for (const p of layer.paths) {
      const len = pathLength(p.points)
      if (p.type === 'perimeter') {
        perimeterLen += len
        printTimeSec += len / perimeterFeed
      } else if (p.type === 'infill') {
        infillLen += len
        printTimeSec += len / infillFeed
      } else if (p.type === 'support') {
        supportLen += len
        printTimeSec += len / supportFeed
      } else {
        travelLen += len
        travelTimeSec += len / layerTravelFeed
        if (len > 0.001) travelSegmentCount += 1
      }

      if (p.type === 'perimeter' || p.type === 'infill' || p.type === 'support') {
        const first = p.points[0]
        const last = p.points[p.points.length - 1]
        if (!first || !last) continue
        if (!firstPrintPoint) firstPrintPoint = first
        lastPrintPoint = last
      }
    }
    if (prevLayerEnd && firstPrintPoint) {
      const il = segmentLength(prevLayerEnd, firstPrintPoint)
      interLayerTravelLen += il
      travelTimeSec += il / layerTravelFeed
      if (il > 0.001) interLayerTravelSegmentCount += 1
    }
    if (lastPrintPoint) {
      prevLayerEnd = lastPrintPoint
    }
  }
  const totalTravelLen = travelLen + interLayerTravelLen
  const retractTriggerDist = Math.max(2, Number(process.outputRetractDist || 0) * 4)
  const avgTravelLen = travelSegmentCount > 0 ? travelLen / travelSegmentCount : 0
  const avgInterLayerTravelLen = interLayerTravelSegmentCount > 0 ? interLayerTravelLen / interLayerTravelSegmentCount : 0
  const segmentTriggeredRetracts =
    (avgTravelLen >= retractTriggerDist ? travelSegmentCount : 0) +
    (avgInterLayerTravelLen >= retractTriggerDist ? interLayerTravelSegmentCount : 0)
  const distanceTriggeredRetracts = Math.floor(totalTravelLen / Math.max(20, retractTriggerDist * 2))
  const retractCount = Math.min(
    travelSegmentCount + interLayerTravelSegmentCount,
    Math.max(segmentTriggeredRetracts, distanceTriggeredRetracts),
  )
  const retractTimeSec = retractCount * (Math.max(0, process.outputRetractDist || 0) / Math.max(1, process.outputRetractSpeed || 1))
  const minLayerTimeSec = Math.max(0, Number(process.outputMinLayerTime || 0))
  const minTotalTimeSec = minLayerTimeSec * Math.max(1, layerCount)
  /** Layer-to-layer Z advance (not in 2D lengths): sum actual Δz from sorted preview; fallback to uniform `sliceHeight`. */
  const zMoveSpeedMmPerSec = Math.max(2, basePrintFeed * 0.4)
  let zTravelMm = 0
  for (let i = 1; i < ordered.length; i++) {
    const dz = ordered[i]!.z - ordered[i - 1]!.z
    if (Number.isFinite(dz) && dz > 0) zTravelMm += dz
  }
  if (layerCount > 1 && zTravelMm < 1e-9) {
    zTravelMm = (layerCount - 1) * sliceH
  }
  const zAxisTimeSec = zTravelMm / zMoveSpeedMmPerSec
  /** Optional Z-hop per layer change (mm vertical at retract speed; not in 2D path lengths). */
  const zHopMm = Math.max(0, Number(process.zHopDistance || 0))
  const zHopLayers = layerCount > 1 ? layerCount - 1 : 0
  const zHopSpeed = Math.max(1, Number(process.outputRetractSpeed || 1))
  const zHopTimeSec = zHopMm > 0 && zHopLayers > 0 ? (zHopLayers * zHopMm) / zHopSpeed : 0
  const motionTimeSec = printTimeSec + travelTimeSec + retractTimeSec + zAxisTimeSec + zHopTimeSec
  const finalTimeSec = Math.max(motionTimeSec, minTotalTimeSec)
  const timeMinutes = finalTimeSec / 60

  const lineWidth = Math.max(0.1, Number(process.sliceLineWidth || 0.4))
  const layerHeight = Math.max(0.05, Number(process.sliceHeight || 0.2))
  const extrusionArea = lineWidth * layerHeight
  const shellMult = Math.max(0.1, Number(process.outputShellMult ?? 1))
  const fillMult = Math.max(0.1, Number(process.outputFillMult ?? 1))
  const sparseMult = Math.max(0.1, Number(process.outputSparseMult ?? 1))
  const weightedExtrusionLen = perimeterLen * shellMult + infillLen * fillMult + supportLen * sparseMult * 0.7
  const pathVolume = weightedExtrusionLen * extrusionArea
  // Convert pseudo-volume to mm filament length with a stable scalar for bridge estimation.
  const filamentMm = pathVolume * 0.65

  return {
    layers: layerCount,
    timeMinutes,
    filamentMm,
    estimateMeta: {
      lengths: {
        perimeter: perimeterLen,
        infill: infillLen,
        support: supportLen,
        travelInLayer: travelLen,
        travelInterLayer: interLayerTravelLen,
      },
      retract: {
        triggerDistance: retractTriggerDist,
        travelSegments: travelSegmentCount,
        interLayerSegments: interLayerTravelSegmentCount,
        estimatedCount: retractCount,
      },
      timeSec: {
        print: printTimeSec,
        travel: travelTimeSec,
        retract: retractTimeSec,
        floor: minTotalTimeSec,
        final: finalTimeSec,
      },
    },
  }
}

/**
 * Reconcile top-level `timeMinutes` with `estimateMeta.timeSec.final` when meta is present.
 * Call after any manual edits to `estimateMeta` or when assembling summaries from partial pipelines.
 */
export function syncSliceSummaryTimeFromEstimateMeta(summary: SliceResultSummary): SliceResultSummary {
  const em = summary.estimateMeta
  if (!em) return summary
  return {
    ...summary,
    timeMinutes: em.timeSec.final / 60,
  }
}
