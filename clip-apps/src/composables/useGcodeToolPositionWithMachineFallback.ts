import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useGcodePathEndToolPosition } from '@/composables/useGcodePathEndToolPosition'
import type { GcodeThreeToolPosition } from '@/composables/useGcodeThreeViewport'

export interface MachinePositionLike {
  x: number
  y: number
  z: number
}

/**
 * When disconnected (or machine still at origin), show tool at G-code path end.
 * When connected with non-zero WCS, prefer live machine coordinates (M114 / status).
 */
export function useGcodeToolPositionWithMachineFallback(
  jobGcode: Ref<string> | ComputedRef<string>,
  machinePosition: Ref<MachinePositionLike> | ComputedRef<MachinePositionLike>,
  preferMachine: Ref<boolean> | ComputedRef<boolean>,
): Ref<GcodeThreeToolPosition> {
  const gcodeEnd = ref<GcodeThreeToolPosition>({ x: 0, y: 0, z: 0 })
  const followGcode = computed(() => !preferMachine.value)
  useGcodePathEndToolPosition(jobGcode, gcodeEnd, followGcode)

  const toolPosition = computed<GcodeThreeToolPosition>(() => {
    if (preferMachine.value) {
      const m = machinePosition.value
      return { x: m.x, y: m.y, z: m.z }
    }
    return gcodeEnd.value
  })

  return toolPosition as Ref<GcodeThreeToolPosition>
}

/** True when WS connected and at least one axis is non-zero (typical after M114). */
export function machinePositionLooksLive(
  connected: boolean,
  pos: MachinePositionLike,
  epsilon = 1e-6,
): boolean {
  if (!connected) return false
  return Math.abs(pos.x) > epsilon || Math.abs(pos.y) > epsilon || Math.abs(pos.z) > epsilon
}
