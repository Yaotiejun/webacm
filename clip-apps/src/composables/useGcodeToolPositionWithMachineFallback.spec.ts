import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { machinePositionLooksLive } from './useGcodeToolPositionWithMachineFallback'

describe('machinePositionLooksLive', () => {
  it('returns false when disconnected', () => {
    expect(machinePositionLooksLive(false, { x: 10, y: 0, z: 0 })).toBe(false)
  })

  it('returns false at origin when connected', () => {
    expect(machinePositionLooksLive(true, { x: 0, y: 0, z: 0 })).toBe(false)
  })

  it('returns true when connected and any axis moved', () => {
    expect(machinePositionLooksLive(true, { x: 0, y: 2, z: 0 })).toBe(true)
  })
})

describe('useGcodeToolPositionWithMachineFallback', () => {
  it('uses gcode end when machine not preferred', async () => {
    const { useGcodeToolPositionWithMachineFallback } = await import('./useGcodeToolPositionWithMachineFallback')
    const jobGcode = ref('G90\nG1 X3 Y4 Z5\n')
    const machine = ref({ x: 99, y: 0, z: 0 })
    const prefer = ref(false)
    const tool = useGcodeToolPositionWithMachineFallback(jobGcode, machine, prefer)
    expect(tool.value).toEqual({ x: 3, y: 4, z: 5 })
  })
})
