import type { SliceTelemetryEvent } from '@/api/slice'

export interface SliceTelemetryDigestEntry extends SliceTelemetryEvent {
  ts: number
}

export function buildSliceTelemetryDigest(
  timeline: Array<SliceTelemetryEvent & { ts: number }>,
  maxEntries = 5,
): SliceTelemetryDigestEntry[] {
  if (!Array.isArray(timeline) || timeline.length === 0) return []
  const capped = Math.max(0, Math.floor(Number(maxEntries) || 0))
  if (capped === 0) return []
  return timeline.slice(0, capped).map((event) => ({
    kind: event.kind,
    code: event.code,
    reasonCode: event.reasonCode,
    message: event.message,
    ts: event.ts,
  }))
}
