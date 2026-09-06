import { clonePlain } from '@/core/clonePlain'

/** grip `net-level` `util.clone` — deep clone via JSON (objects/arrays only). */
export function gripNetLevelClone<T>(value: T): T {
  return clonePlain(value)
}
