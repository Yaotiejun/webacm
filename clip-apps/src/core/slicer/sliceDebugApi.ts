import {
  exportSliceTelemetryConfigJson,
  getSliceTelemetryConfigSnapshot,
  getSliceTelemetryDigestMaxEntries,
  getSliceTelemetryTimelineMaxEntries,
  importSliceTelemetryConfigJson,
  resetSliceTelemetryConfig,
  resetSliceTelemetryDigestMaxEntriesOverride,
  resetSliceTelemetryTimelineMaxEntriesOverride,
  setSliceTelemetryDigestMaxEntriesOverride,
  setSliceTelemetryTimelineMaxEntriesOverride,
} from './sliceTelemetryConfig'
import type { SliceInputMeta, SliceLegacyDebugSnapshot, SliceTelemetryEvent } from '@/api/slice'
import type { SliceTelemetryDigestEntry } from './sliceTelemetryDigest'
import { buildSliceTelemetryDigestForJob } from './sliceTelemetryJobDigest'
import { buildTelemetryDigestText } from './telemetryComment'

type DevWindowLike = Window & {
  __slicerDebug?: SlicerDebugApi
}

export interface SliceTelemetryTimelineEntry extends SliceTelemetryEvent {
  ts: number
}

/** Optional slice context for diagnostics export (live session + saved Job). */
export interface SliceDiagnosticsContext {
  jobId?: string | null
  liveSliceInputMeta?: SliceInputMeta | null
  savedJobSliceInputMeta?: SliceInputMeta | null
  liveLegacyDebug?: SliceLegacyDebugSnapshot | null
  savedJobLegacyDebug?: SliceLegacyDebugSnapshot | null
}

export interface SlicerDebugApiOptions {
  dumpTimeline?: () => SliceTelemetryTimelineEntry[]
  clearTimeline?: () => void
  onConfigChange?: (config: { digestMaxEntries: number; timelineMaxEntries: number }) => void
  getDiagnosticsContext?: () => SliceDiagnosticsContext | null | undefined
}

export interface SlicerDebugApi {
  getTelemetryDigestMaxEntries: () => number
  setTelemetryDigestMaxEntries: (value: unknown) => number
  resetTelemetryDigestMaxEntries: () => number
  getTelemetryTimelineMaxEntries: () => number
  setTelemetryTimelineMaxEntries: (value: unknown) => number
  resetTelemetryTimelineMaxEntries: () => number
  getConfigSnapshot: () => { digestMaxEntries: number; timelineMaxEntries: number }
  dumpTimeline: () => SliceTelemetryTimelineEntry[]
  dumpDigest: () => SliceTelemetryDigestEntry[]
  exportDigestText: (options?: { header?: string }) => string
  exportDiagnostics: (options?: { header?: string }) => string
  exportConfigJson: () => string
  importConfigJson: (raw: string) => { digestMaxEntries: number; timelineMaxEntries: number }
  resetConfig: () => { digestMaxEntries: number; timelineMaxEntries: number }
  clearTimeline: () => void
}

export function createSlicerDebugApi(options?: SlicerDebugApiOptions): SlicerDebugApi {
  const snapshot = () => getSliceTelemetryConfigSnapshot()
  return {
    getTelemetryDigestMaxEntries: () => getSliceTelemetryDigestMaxEntries(),
    setTelemetryDigestMaxEntries: (value: unknown) => {
      setSliceTelemetryDigestMaxEntriesOverride(value)
      const next = getSliceTelemetryDigestMaxEntries()
      options?.onConfigChange?.(snapshot())
      return next
    },
    resetTelemetryDigestMaxEntries: () => {
      resetSliceTelemetryDigestMaxEntriesOverride()
      return getSliceTelemetryDigestMaxEntries()
    },
    getTelemetryTimelineMaxEntries: () => getSliceTelemetryTimelineMaxEntries(),
    setTelemetryTimelineMaxEntries: (value: unknown) => {
      setSliceTelemetryTimelineMaxEntriesOverride(value)
      const next = getSliceTelemetryTimelineMaxEntries()
      options?.onConfigChange?.(snapshot())
      return next
    },
    resetTelemetryTimelineMaxEntries: () => {
      resetSliceTelemetryTimelineMaxEntriesOverride()
      return getSliceTelemetryTimelineMaxEntries()
    },
    getConfigSnapshot: () => snapshot(),
    dumpTimeline: () => options?.dumpTimeline?.() ?? [],
    dumpDigest: () => buildSliceTelemetryDigestForJob(options?.dumpTimeline?.() ?? []),
    exportDigestText: (opts?: { header?: string }) =>
      buildTelemetryDigestText(buildSliceTelemetryDigestForJob(options?.dumpTimeline?.() ?? []), opts),
    exportDiagnostics: (opts?: { header?: string }) => {
      const config = {
        digestMaxEntries: getSliceTelemetryDigestMaxEntries(),
        timelineMaxEntries: getSliceTelemetryTimelineMaxEntries(),
      }
      const timeline = options?.dumpTimeline?.() ?? []
      const digest = buildSliceTelemetryDigestForJob(timeline)
      const lines: string[] = []
      if (opts?.header) lines.push(opts.header)
      lines.push(`config.digestMaxEntries=${config.digestMaxEntries}`)
      lines.push(`config.timelineMaxEntries=${config.timelineMaxEntries}`)
      lines.push(`timeline.size=${timeline.length}`)
      lines.push(`digest.size=${digest.length}`)
      lines.push(buildTelemetryDigestText(digest))
      const ctx = options?.getDiagnosticsContext?.()
      if (ctx && (ctx.jobId != null || ctx.liveSliceInputMeta || ctx.savedJobSliceInputMeta || ctx.liveLegacyDebug || ctx.savedJobLegacyDebug)) {
        lines.push('--- sliceInputMeta ---')
        if (ctx.jobId != null && ctx.jobId !== '') lines.push(`context.jobId=${ctx.jobId}`)
        if (ctx.liveSliceInputMeta) lines.push(`live=${JSON.stringify(ctx.liveSliceInputMeta)}`)
        if (ctx.savedJobSliceInputMeta) lines.push(`jobSaved=${JSON.stringify(ctx.savedJobSliceInputMeta)}`)
        if (ctx.liveLegacyDebug || ctx.savedJobLegacyDebug) {
          lines.push('--- legacyFdmDebug ---')
          if (ctx.liveLegacyDebug) lines.push(`live=${JSON.stringify(ctx.liveLegacyDebug)}`)
          if (ctx.savedJobLegacyDebug) lines.push(`jobSaved=${JSON.stringify(ctx.savedJobLegacyDebug)}`)
        }
      }
      return lines.filter((line) => line.length > 0).join('\n')
    },
    exportConfigJson: () => exportSliceTelemetryConfigJson(),
    importConfigJson: (raw: string) => {
      const next = importSliceTelemetryConfigJson(raw)
      options?.onConfigChange?.(next)
      return next
    },
    resetConfig: () => {
      const next = resetSliceTelemetryConfig()
      options?.onConfigChange?.(next)
      return next
    },
    clearTimeline: () => {
      options?.clearTimeline?.()
    },
  }
}

export function installSlicerDebugApi(targetWindow: Window, options?: SlicerDebugApiOptions) {
  const w = targetWindow as DevWindowLike
  w.__slicerDebug = createSlicerDebugApi(options)
}

export function getSlicerDebugApi(targetWindow: Window): SlicerDebugApi | undefined {
  const w = targetWindow as DevWindowLike
  return w.__slicerDebug
}

export function uninstallSlicerDebugApi(targetWindow: Window) {
  const w = targetWindow as DevWindowLike
  delete w.__slicerDebug
}
