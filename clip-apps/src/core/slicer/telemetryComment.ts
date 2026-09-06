import type { SliceInputMeta, SliceLegacyDebugSnapshot } from '@/api/slice'
import type { SliceTelemetryDigestEntry } from './sliceTelemetryDigest'

export function formatTelemetryDigestEntry(event: SliceTelemetryDigestEntry): string {
  return `[${new Date(event.ts).toISOString()}] ${event.code} / ${event.reasonCode} :: ${event.message.replace(/\r?\n/g, ' ')}`
}

export function buildTelemetryDigestText(
  digest: SliceTelemetryDigestEntry[],
  options?: { header?: string },
): string {
  const lines: string[] = []
  if (options?.header) lines.push(options.header)
  for (const event of digest) {
    lines.push(formatTelemetryDigestEntry(event))
  }
  return lines.join('\n')
}

export function appendTelemetryDigestComments(lines: string[], digest: SliceTelemetryDigestEntry[]) {
  if (!Array.isArray(digest) || digest.length === 0) return
  lines.push('; fallbackTelemetryDigestStart')
  for (const event of digest) {
    lines.push(`; ${formatTelemetryDigestEntry(event)}`)
  }
  lines.push('; fallbackTelemetryDigestEnd')
}

/** Max comment lines from a saved diagnostics snapshot (avoids bloating G-code). */
export const DEFAULT_DIAGNOSTICS_SNAPSHOT_COMMENT_MAX_LINES = 100

export function appendDiagnosticsSnapshotComments(
  lines: string[],
  snapshot: string | null | undefined,
  options?: { maxLines?: number },
) {
  const trimmed = typeof snapshot === 'string' ? snapshot.trim() : ''
  if (!trimmed) return

  const maxLines = options?.maxLines ?? DEFAULT_DIAGNOSTICS_SNAPSHOT_COMMENT_MAX_LINES
  const rawLines = trimmed.split(/\r?\n/)

  lines.push('; slicerDiagnosticsSnapshotStart')
  let count = 0
  for (const seg of rawLines) {
    if (count >= maxLines) {
      const omitted = rawLines.length - maxLines
      lines.push(`; ... (${omitted} more line${omitted === 1 ? '' : 's'} truncated)`)
      break
    }
    const safe = seg.replace(/\r?\n/g, ' ').replace(/^;+\s?/, '')
    lines.push(`; ${safe}`)
    count++
  }
  lines.push('; slicerDiagnosticsSnapshotEnd')
}

export type SliceInputMetaGcodeRole = 'Live' | 'Job'

/** Compact G-code comment block for slice migration / diff (no JSON newlines). */
export function appendSliceInputMetaComments(
  lines: string[],
  meta: SliceInputMeta | null | undefined,
  role: SliceInputMetaGcodeRole,
) {
  if (!meta) return
  const tag = role === 'Job' ? 'Job' : 'Live'
  const b = meta.planarBounds
  lines.push(`; sliceInputMeta${tag}Start`)
  lines.push(
    `; tri=${meta.triangleCount} vert=${meta.vertexCount} zSpanMm=${meta.zSpanMm.toFixed(6)} bounds=(${b.minX.toFixed(4)},${b.minY.toFixed(4)})-(${b.maxX.toFixed(4)},${b.maxY.toFixed(4)})`,
  )
  lines.push(`; sliceInputMeta${tag}End`)
}

export function sliceInputMetaRoughlyEqual(a: SliceInputMeta, b: SliceInputMeta): boolean {
  const ba = a.planarBounds
  const bb = b.planarBounds
  return (
    a.vertexCount === b.vertexCount &&
    a.triangleCount === b.triangleCount &&
    Math.abs(a.zSpanMm - b.zSpanMm) < 1e-6 &&
    ba.minX === bb.minX &&
    ba.maxX === bb.maxX &&
    ba.minY === bb.minY &&
    ba.maxY === bb.maxY
  )
}

/** Emit live session meta and, when it differs, Job-saved meta (re-open / diff vs grip). */
export function appendSliceInputMetaPairForGcode(
  lines: string[],
  live: SliceInputMeta | null | undefined,
  jobSaved: SliceInputMeta | null | undefined,
) {
  if (live) appendSliceInputMetaComments(lines, live, 'Live')
  if (jobSaved && (!live || !sliceInputMetaRoughlyEqual(live, jobSaved))) {
    appendSliceInputMetaComments(lines, jobSaved, 'Job')
  }
}

/** Compact legacy FDM runtime/debug block for migration parity comments. */
export function appendLegacyFdmDebugComments(
  lines: string[],
  debug: SliceLegacyDebugSnapshot | null | undefined,
) {
  if (!debug) return
  lines.push(`; legacyFdmReady=${debug.ready ? '1' : '0'}`)
  lines.push(`; legacyFdmHasSliceImpl=${debug.hasSliceImpl ? '1' : '0'}`)
  if (debug.initErrorMessage) {
    lines.push(`; legacyFdmInitError=${debug.initErrorMessage.replace(/\r?\n/g, ' ').slice(0, 240)}`)
  }
  if (debug.legacyImportErrorMessage) {
    lines.push(`; legacyFdmImportError=${debug.legacyImportErrorMessage.replace(/\r?\n/g, ' ').slice(0, 240)}`)
  }
}
