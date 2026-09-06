/**
 * Production GridBot soak via device-bridge WebSocket.
 *
 *   cd shape_cam/device-bridge
 *   $env:GRIDBOT_BACKEND='tcp'; $env:GRIDBOT_TCP='192.168.1.50:23'
 *   npm run dev
 *
 *   cd ../clip-apps
 *   $env:GRIDBOT_SOAK_WS='ws://localhost:9999/gridbot'
 *   npm run soak:gridbot
 */
import { describe, expect, it } from 'vitest'
import { runGridbotProductionSoak } from '@/core/devices/gridbotProductionSoakRunner'
import { gridbotProductionSoakWebSocketUrl } from '@/core/devices/gridbotProductionSoak'

const SOAK_WS = gridbotProductionSoakWebSocketUrl()
const SOAK_TIMEOUT_MS = Number(process.env.GRIDBOT_SOAK_TIMEOUT_MS ?? 45_000)

describe.skipIf(!SOAK_WS)('gridbotProductionSoak.live', () => {
  it(
    'polls expose M105, M114, and ADVANCED_OK B/P',
    async () => {
      const result = await runGridbotProductionSoak({ endpoint: SOAK_WS! })
      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(
          'gridbot production soak:',
          result.errors,
          result.samples.slice(-6).map((s) => s.line),
        )
      }
      expect(result.sawM105, result.errors.join('; ')).toBe(true)
      expect(result.sawM114, result.errors.join('; ')).toBe(true)
      expect(result.sawAdvancedOk, result.errors.join('; ')).toBe(true)
      expect(result.ok).toBe(true)
    },
    SOAK_TIMEOUT_MS + 10_000,
  )
})
