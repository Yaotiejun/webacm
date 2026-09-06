/**
 * Parse `ws-settings` localStorage JSON into a mutable object record.
 * Returns `null` when missing, invalid JSON, or not a plain object (e.g. array root),
 * matching defensive contracts used by `api/settings` `getSettings`.
 */
export function tryParseWsSettingsRecord(raw: string | null): Record<string, unknown> | null {
  if (raw == null || raw === '') return null
  try {
    const v = JSON.parse(raw) as unknown
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return null
    return v as Record<string, unknown>
  } catch {
    return null
  }
}
