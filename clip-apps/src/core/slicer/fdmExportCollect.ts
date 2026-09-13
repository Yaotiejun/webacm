/**
 * Collects streamed G-code from legacy `fdm_export(print, online, ondone)`.
 */
export interface FdmExportCollectResult {
  gcodeText: string
  lineEstimate: number
}

function normalizeFdmGcodeText(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Runs `fdm_export` and joins `online()` string batches (legacy joins with `\n` per flush).
 */
export function collectFdmExportGcode(
  fdmExportImpl: (
    print: unknown,
    online: (chunk: unknown) => void,
    ondone?: (err?: unknown) => void,
    ondebug?: (msg: unknown) => void,
  ) => unknown,
  print: unknown,
): FdmExportCollectResult {
  const chunks: string[] = []

  fdmExportImpl(
    print,
    (chunk: unknown) => {
      if (chunk == null) return
      if (typeof chunk === 'string') {
        if (chunk.length) chunks.push(chunk)
        return
      }
      if (Array.isArray(chunk)) {
        const joined = chunk.map(String).join('\n')
        if (joined.length) chunks.push(joined)
      }
    },
    () => {
      /* fdm_export may omit ondone; streaming completes synchronously */
    },
  )

  const gcodeText = normalizeFdmGcodeText(chunks.join('\n'))
  const lineEstimate = gcodeText ? gcodeText.split('\n').length : 0
  return { gcodeText, lineEstimate }
}
