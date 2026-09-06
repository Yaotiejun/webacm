import { normalizeCamGcodeText } from '@/core/cam/camGcodeNormalize'

/**
 * Stable text for hashing: LF endings, trim trailing spaces per line, trim outer whitespace.
 * Use the same normalization when comparing against grip `cam_export` captures.
 */
/** Lines omitted from migration SHA (volatile legacy cam_export header). */
const FINGERPRINT_IGNORE_LINE = /^; (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) /

export function normalizeCamGcodeForMigrationFingerprint(text: string): string {
  return normalizeCamGcodeText(text)
    .split('\n')
    .filter((line) => !FINGERPRINT_IGNORE_LINE.test(line))
    .map((line) => line.replace(/\s+$/g, ''))
    .join('\n')
    .trim()
}

/** SHA-256 (hex) of UTF-8 bytes; requires `globalThis.crypto.subtle` (browser / modern Node). */
export async function sha256HexUtf8(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('crypto.subtle is not available (HTTPS or secure context required for SHA-256)')
  }
  const data = new TextEncoder().encode(text)
  const digest = await subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
