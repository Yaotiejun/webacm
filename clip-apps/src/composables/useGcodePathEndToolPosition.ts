import { ref, watch, type Ref } from 'vue'
import { getCachedGcodePathBuild } from '@/core/gcode/gcodePathBuildCache'
import type { GcodeThreeToolPosition } from '@/composables/useGcodeThreeViewport'

/**
 * Move the viewport tool marker to the last WCS point of the parsed G-code path.
 * Skips Carvera/GridBot when they drive position from live machine state.
 */
export function useGcodePathEndToolPosition(
  jobGcode: Ref<string>,
  toolPosition: Ref<GcodeThreeToolPosition>,
  enabled?: Ref<boolean>,
) {
  const enabledRef = enabled ?? ref(true)
  watch(
    jobGcode,
    (text) => {
      if (!enabledRef.value) return
      const trimmed = text?.trim() ?? ''
      if (!trimmed) return
      const built = getCachedGcodePathBuild(trimmed)
      const end = built.endPosition
      toolPosition.value = { x: end.x, y: end.y, z: end.z }
    },
    { immediate: true },
  )
}
