import type { SliceTelemetryEvent } from '@/api/slice'
import { getSliceTelemetryTimelineMaxEntries } from './sliceTelemetryConfig'

export type SliceTelemetryTimelineEntry = SliceTelemetryEvent & { ts: number }

export function pushSliceTelemetryTimelineEntry(
  timeline: SliceTelemetryTimelineEntry[],
  event: SliceTelemetryEvent,
  options?: { now?: number; maxEntries?: number },
): SliceTelemetryTimelineEntry[] {
  const now = Number.isFinite(options?.now) ? Number(options?.now) : Date.now()
  const maxEntries = Math.max(0, Math.floor(Number(options?.maxEntries ?? getSliceTelemetryTimelineMaxEntries())))
  const next = [{ ...event, ts: now }, ...timeline]
  if (next.length <= maxEntries) return next
  return next.slice(0, maxEntries)
}
