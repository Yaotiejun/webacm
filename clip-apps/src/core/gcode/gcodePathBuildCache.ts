import { buildGcodePathPositions, type GcodePathBuildResult } from './gcodePathPreview'

const MAX_CACHE_ENTRIES = 8
const cache = new Map<string, GcodePathBuildResult>()

/** LRU-ish cache for large G-code previews (viewport + tool-end sync share one parse). */
export function getCachedGcodePathBuild(
  gcode: string,
  opts?: { maxLines?: number; maxVertices?: number },
): GcodePathBuildResult {
  const key = opts ? `${gcode}\0${opts.maxLines ?? ''}\0${opts.maxVertices ?? ''}` : gcode
  const hit = cache.get(key)
  if (hit) return hit
  const built = buildGcodePathPositions(gcode, opts)
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value
    if (first != null) cache.delete(first)
  }
  cache.set(key, built)
  return built
}

/** Test-only: clear module cache between cases. */
export function resetGcodePathBuildCacheForTests(): void {
  cache.clear()
}
