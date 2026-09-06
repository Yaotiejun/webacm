import { CarveraConnection } from '@/core/devices/carvera'
import { parseGrblStatusReport } from '@/core/devices/grblLineParse'
import {
  evaluateCarveraProductionSoak,
  type CarveraProductionSoakResult,
  type CarveraProductionSoakSample,
} from '@/core/devices/carveraProductionSoak'
import { productionSoakSleep } from '@/core/devices/productionSoakSleep'

export interface CarveraProductionSoakRunOptions {
  endpoint: string
  polls?: number
  intervalMs?: number
  timeoutMs?: number
}

/** Poll Carvera controller via device-bridge WebSocket. */
export async function runCarveraProductionSoak(
  opts: CarveraProductionSoakRunOptions,
): Promise<CarveraProductionSoakResult & { samples: CarveraProductionSoakSample[] }> {
  const polls = opts.polls ?? Number(process.env.CARVERA_SOAK_POLLS ?? 16)
  const intervalMs = opts.intervalMs ?? Number(process.env.CARVERA_SOAK_INTERVAL_MS ?? 500)
  const timeoutMs = opts.timeoutMs ?? Number(process.env.CARVERA_SOAK_TIMEOUT_MS ?? 45_000)

  const conn = new CarveraConnection({ endpoint: opts.endpoint })
  const samples: CarveraProductionSoakSample[] = []
  conn.onLine((line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('<')) return
    samples.push({
      line: trimmed,
      parsed: parseGrblStatusReport(trimmed),
      at: Date.now(),
    })
  })

  await conn.connect()
  const deadline = Date.now() + timeoutMs
  for (let i = 0; i < polls && Date.now() < deadline; i += 1) {
    conn.sendLine('?')
    await productionSoakSleep(intervalMs)
  }
  conn.disconnect()

  const result = evaluateCarveraProductionSoak(samples)
  return { ...result, samples }
}
