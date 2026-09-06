import { GridBotConnection } from '@/core/devices/gridbot'
import {
  evaluateGridbotProductionSoak,
  type GridbotProductionSoakResult,
  type GridbotProductionSoakSample,
} from '@/core/devices/gridbotProductionSoak'
import { productionSoakSleep } from '@/core/devices/productionSoakSleep'

export interface GridbotProductionSoakRunOptions {
  endpoint: string
  polls?: number
  intervalMs?: number
  timeoutMs?: number
}

/** Poll GridBot via device-bridge WebSocket. */
export async function runGridbotProductionSoak(
  opts: GridbotProductionSoakRunOptions,
): Promise<GridbotProductionSoakResult & { samples: GridbotProductionSoakSample[] }> {
  const polls = opts.polls ?? Number(process.env.GRIDBOT_SOAK_POLLS ?? 8)
  const intervalMs = opts.intervalMs ?? Number(process.env.GRIDBOT_SOAK_INTERVAL_MS ?? 800)
  const timeoutMs = opts.timeoutMs ?? Number(process.env.GRIDBOT_SOAK_TIMEOUT_MS ?? 45_000)

  const conn = new GridBotConnection({ endpoint: opts.endpoint })
  const samples: GridbotProductionSoakSample[] = []
  conn.onLine((line) => samples.push({ line: line.trim(), at: Date.now() }))

  await conn.connect()
  const deadline = Date.now() + timeoutMs
  for (let i = 0; i < polls && Date.now() < deadline; i += 1) {
    conn.sendLine('M105')
    await productionSoakSleep(intervalMs / 2)
    conn.sendLine('M114')
    await productionSoakSleep(intervalMs / 2)
    conn.sendLine('N1 G28')
  }
  conn.disconnect()

  const result = evaluateGridbotProductionSoak(samples)
  return { ...result, samples }
}
