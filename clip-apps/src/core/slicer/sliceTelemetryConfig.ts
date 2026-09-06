export const DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES = 5
export const DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES = 20

let sliceTelemetryDigestMaxEntriesOverride: number | null = null
let sliceTelemetryTimelineMaxEntriesOverride: number | null = null

export function getSliceTelemetryDigestMaxEntries(): number {
  return sliceTelemetryDigestMaxEntriesOverride ?? DEFAULT_SLICE_TELEMETRY_DIGEST_MAX_ENTRIES
}

export function setSliceTelemetryDigestMaxEntriesOverride(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return
  sliceTelemetryDigestMaxEntriesOverride = Math.max(0, Math.floor(n))
}

export function resetSliceTelemetryDigestMaxEntriesOverride() {
  sliceTelemetryDigestMaxEntriesOverride = null
}

export function getSliceTelemetryTimelineMaxEntries(): number {
  return sliceTelemetryTimelineMaxEntriesOverride ?? DEFAULT_SLICE_TELEMETRY_TIMELINE_MAX_ENTRIES
}

export function setSliceTelemetryTimelineMaxEntriesOverride(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return
  sliceTelemetryTimelineMaxEntriesOverride = Math.max(0, Math.floor(n))
}

export function resetSliceTelemetryTimelineMaxEntriesOverride() {
  sliceTelemetryTimelineMaxEntriesOverride = null
}

export interface SliceTelemetryConfigSnapshot {
  digestMaxEntries: number
  timelineMaxEntries: number
}

export function getSliceTelemetryConfigSnapshot(): SliceTelemetryConfigSnapshot {
  return {
    digestMaxEntries: getSliceTelemetryDigestMaxEntries(),
    timelineMaxEntries: getSliceTelemetryTimelineMaxEntries(),
  }
}

export function applySliceTelemetryConfigSnapshot(input: {
  digestMaxEntries?: unknown
  timelineMaxEntries?: unknown
}): SliceTelemetryConfigSnapshot {
  if ('digestMaxEntries' in input) setSliceTelemetryDigestMaxEntriesOverride(input.digestMaxEntries)
  if ('timelineMaxEntries' in input) setSliceTelemetryTimelineMaxEntriesOverride(input.timelineMaxEntries)
  return getSliceTelemetryConfigSnapshot()
}

export function resetSliceTelemetryConfig(): SliceTelemetryConfigSnapshot {
  resetSliceTelemetryDigestMaxEntriesOverride()
  resetSliceTelemetryTimelineMaxEntriesOverride()
  return getSliceTelemetryConfigSnapshot()
}

export function exportSliceTelemetryConfigJson(): string {
  return JSON.stringify(getSliceTelemetryConfigSnapshot(), null, 2)
}

export function importSliceTelemetryConfigJson(raw: string): SliceTelemetryConfigSnapshot {
  try {
    const parsed = JSON.parse(raw) as { digestMaxEntries?: unknown; timelineMaxEntries?: unknown }
    return applySliceTelemetryConfigSnapshot(parsed)
  } catch {
    return getSliceTelemetryConfigSnapshot()
  }
}
