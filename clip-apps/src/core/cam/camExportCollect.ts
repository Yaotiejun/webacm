import { normalizeCamGcodeText } from '@/core/cam/camGcodeNormalize'

export interface CamExportCollectResult {
  /** LF-normalized full G-code text from `cam_export` stream. */
  gcodeText: string
  /** Section markers emitted as `{ section: string }` (op boundaries, header/footer). */
  sections: string[]
}

/**
 * Runs legacy `cam_export(print, online)` and collects all string chunks the same way
 * `export.js` flushes (batched CRLF blocks + section markers).
 */
export function collectCamExportGcode(
  camExportImpl: (print: unknown, online: (chunk: unknown) => void) => unknown,
  print: unknown,
): CamExportCollectResult {
  const chunks: string[] = []
  const sections: string[] = []

  camExportImpl(print, (chunk: unknown) => {
    if (chunk == null) return
    if (typeof chunk === 'object' && chunk !== null && 'section' in chunk) {
      const s = (chunk as { section?: unknown }).section
      if (typeof s === 'string' && s.length) sections.push(s)
      return
    }
    if (typeof chunk === 'string') {
      if (chunk.length) chunks.push(chunk)
      return
    }
    if (Array.isArray(chunk)) {
      const joined = chunk.map(String).join('\n')
      if (joined.length) chunks.push(joined)
    }
  })

  // Legacy flushes `output.join("\r\n")` per batch; batches already end with a line break.
  // Joining with `\n` would duplicate blank lines between `online()` calls.
  const raw = chunks.join('')
  return { gcodeText: normalizeCamGcodeText(raw), sections }
}
