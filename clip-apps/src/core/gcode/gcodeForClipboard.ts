/** Max characters copied to clipboard in one action (browser / UX guard). */
export const GCODE_CLIPBOARD_MAX_CHARS = 500_000

export function gcodeForClipboard(
  gcodeText: string,
  maxChars: number = GCODE_CLIPBOARD_MAX_CHARS,
): { text: string; truncated: boolean } {
  const raw = gcodeText.trim()
  if (raw.length <= maxChars) return { text: raw, truncated: false }
  const notice = `; … truncated for clipboard (${maxChars} of ${raw.length} chars) …\n`
  return { text: notice + raw.slice(0, maxChars), truncated: true }
}
