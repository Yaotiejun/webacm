import type { SliceTelemetryEvent } from '@/api/slice'

export type SliceTelemetryTimelineEntry = SliceTelemetryEvent & { ts: number }

export function normalizeSliceTelemetryTimelineEntries(
  entries: Array<SliceTelemetryEvent & { ts: number }>,
  maxEntries: number,
): SliceTelemetryTimelineEntry[] {
  const cap = Math.max(0, Math.floor(Number(maxEntries)))
  if (!Array.isArray(entries) || cap === 0) return []
  return entries
    .filter((e) => typeof e?.kind === 'string' && typeof e?.code === 'string' && typeof e?.reasonCode === 'string')
    .map((e) => ({ ...e, ts: Number.isFinite(e.ts) ? Number(e.ts) : 0 }))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, cap)
}
