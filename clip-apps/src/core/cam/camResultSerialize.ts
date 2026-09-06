import type { CamJobResult } from '@/types/camJob'

export const CAM_RESULT_INLINE_GCODE_MAX_CHARS = 1200
const PREVIEW_MAX_LINES = 10

/** Extract section list from camEngine `notes` (`legacy cam_export sections: …`). */
export function extractCamExportSectionsLine(notes: string[]): string | null {
  const raw = notes.find((n) => n.startsWith('legacy cam_export sections:'))
  if (!raw) return null
  return raw.slice('legacy cam_export sections:'.length).trim() || null
}

/**
 * JSON body for UI/logs: omit huge `gcodeText`, add `gcodeSummary` (line count + head preview).
 */
export function toCamJobResultDisplayJson(result: CamJobResult): unknown {
  const text = result.gcodeText
  if (text == null || text === '') return result
  if (text.length <= CAM_RESULT_INLINE_GCODE_MAX_CHARS) return result

  const lines = text.split(/\r?\n/)
  const { gcodeText: _g, ...rest } = result
  return {
    ...rest,
    gcodeSummary: {
      lineCount: lines.length,
      byteLength: text.length,
      previewLineCount: Math.min(PREVIEW_MAX_LINES, lines.length),
      preview: lines.slice(0, PREVIEW_MAX_LINES).join('\n'),
    },
  }
}
