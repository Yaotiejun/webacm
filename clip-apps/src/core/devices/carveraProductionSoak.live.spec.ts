/**
 * Production Carvera soak over device-bridge → real controller (TCP or mock).
 *
 * 1) Start device-bridge toward the machine:
 *    cd shape_cam/device-bridge
 *    $env:CARVERA_BACKEND='tcp'
 *    $env:CARVERA_TCP='192.168.1.100:3001'
 *    npm run dev
 *
 * 2) Run soak from clip-apps:
 *    $env:CARVERA_SOAK_WS='ws://localhost:9999/carvera'
 *    $env:CARVERA_SOAK_POLLS='20'
 *    npm run soak:carvera
 */
import { describe, expect, it } from 'vitest'
import { runCarveraProductionSoak } from '@/core/devices/carveraProductionSoakRunner'
import {
  carveraProductionSoakMinPolls,
  carveraProductionSoakWebSocketUrl,
} from '@/core/devices/carveraProductionSoak'

const SOAK_WS = carveraProductionSoakWebSocketUrl()
const SOAK_TIMEOUT_MS = Number(process.env.CARVERA_SOAK_TIMEOUT_MS ?? 45_000)

describe.skipIf(!SOAK_WS)('carveraProductionSoak.live', () => {
  it(
    'production status polls expose L/W/A/H, MPos/WPos, and Buf',
    async () => {
      const result = await runCarveraProductionSoak({ endpoint: SOAK_WS! })
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error('carvera production soak:', {
          errors: result.errors,
          polls: result.pollCount,
          statusLines: result.statusLineCount,
          minPolls: carveraProductionSoakMinPolls(),
          last: result.samples.at(-1)?.line,
        })
      }
      expect(result.sawLaser, result.errors.join('; ')).toBe(true)
      expect(result.sawProbe, result.errors.join('; ')).toBe(true)
      expect(result.sawSetup, result.errors.join('; ')).toBe(true)
      expect(result.sawHalt, result.errors.join('; ')).toBe(true)
      expect(result.sawMpos, result.errors.join('; ')).toBe(true)
      expect(result.sawWpos, result.errors.join('; ')).toBe(true)
      expect(result.sawBuf, result.errors.join('; ')).toBe(true)
      expect(result.ok).toBe(true)
    },
    SOAK_TIMEOUT_MS + 10_000,
  )
})
