export type StableJsonValue =
  | null
  | boolean
  | number
  | string
  | StableJsonValue[]
  | { [key: string]: StableJsonValue }

export function toStableJsonValue(value: unknown): StableJsonValue {
  if (value == null) return null
  const t = typeof value
  if (t === 'boolean' || t === 'number' || t === 'string') {
    return value as boolean | number | string
  }
  if (Array.isArray(value)) {
    return value.map((item) => toStableJsonValue(item))
  }
  if (t === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const out: { [key: string]: StableJsonValue } = {}
    for (const key of keys) {
      out[key] = toStableJsonValue(record[key])
    }
    return out
  }
  return String(value)
}

export function toStableJsonText(value: unknown): string {
  return JSON.stringify(toStableJsonValue(value))
}

export function stableJsonEqual(a: unknown, b: unknown): boolean {
  return toStableJsonText(a) === toStableJsonText(b)
}
