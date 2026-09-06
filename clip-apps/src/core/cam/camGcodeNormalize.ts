/**
 * Normalize legacy `cam_export` stream chunks to LF-separated G-code text for storage,
 * diffing, and golden tests vs grip exports.
 */
export function normalizeCamGcodeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}
