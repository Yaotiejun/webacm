import type { SliceTelemetryEvent } from '@/api/slice'
import { getSliceTelemetryDigestMaxEntries } from './sliceTelemetryConfig'
import { buildSliceTelemetryDigest, type SliceTelemetryDigestEntry } from './sliceTelemetryDigest'

export type SliceTelemetryTimelineEntry = SliceTelemetryEvent & { ts: number }

export function buildSliceTelemetryDigestForJob(
  timeline: SliceTelemetryTimelineEntry[],
): SliceTelemetryDigestEntry[] {
  return buildSliceTelemetryDigest(timeline, getSliceTelemetryDigestMaxEntries())
}
