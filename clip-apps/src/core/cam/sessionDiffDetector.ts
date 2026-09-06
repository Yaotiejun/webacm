import { camProcessFieldsEqual } from './camProcessFieldsEqual'

export function countChangedFields(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  ignoreKeys: string[] = [],
): number {
  const ignore = new Set(ignoreKeys)
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(incoming)])).filter((k) => !ignore.has(k))
  let changed = 0
  for (const key of keys) {
    if (!camProcessFieldsEqual(current[key], incoming[key])) changed += 1
  }
  return changed
}

export function listChangedFieldKeys(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  ignoreKeys: string[] = [],
): string[] {
  const ignore = new Set(ignoreKeys)
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(incoming)])).filter((k) => !ignore.has(k))
  return keys.filter((key) => !camProcessFieldsEqual(current[key], incoming[key]))
}
