import {
  evaluateCarveraLaserProbeSoak,
  type CarveraLaserProbeSoakResult,
  type CarveraLaserProbeSoakSample,
} from '@/core/devices/carveraLaserProbeSoak'
import { parseGrblStatusReport } from '@/core/devices/grblLineParse'

export type CarveraProductionSoakSample = CarveraLaserProbeSoakSample

export interface CarveraProductionSoakResult extends CarveraLaserProbeSoakResult {
  sawMpos: boolean
  sawWpos: boolean
  sawFeed: boolean
  sawBuf: boolean
  statusLineCount: number
}

export function carveraProductionSoakWebSocketUrl(): string | null {
  return process.env.CARVERA_SOAK_WS?.trim() || null
}

export function carveraProductionSoakMinPolls(): number {
  const n = Number(process.env.CARVERA_SOAK_MIN_POLLS ?? 8)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8
}

/**
 * Production controller soak: carve-control L/W/A/H plus MPos/WPos/Buf on real `?` polls.
 */
export function evaluateCarveraProductionSoak(
  samples: readonly CarveraProductionSoakSample[],
): CarveraProductionSoakResult {
  const base = evaluateCarveraLaserProbeSoak(samples)
  const errors = [...base.errors]
  let sawMpos = false
  let sawWpos = false
  let sawFeed = false
  let sawBuf = false
  let statusLineCount = 0

  for (const sample of samples) {
    if (!sample.line.startsWith('<') || !sample.line.endsWith('>')) continue
    statusLineCount += 1
    const parsed = sample.parsed ?? parseGrblStatusReport(sample.line)
    if (!parsed) continue
    if (parsed.mpos && [parsed.mpos.x, parsed.mpos.y, parsed.mpos.z].some((v) => v != null)) {
      sawMpos = true
    }
    if (parsed.wpos && [parsed.wpos.x, parsed.wpos.y, parsed.wpos.z].some((v) => v != null)) {
      sawWpos = true
    }
    if (parsed.feed?.current != null || parsed.feed?.target != null) sawFeed = true
    if (parsed.buf != null) sawBuf = true
  }

  const minPolls = carveraProductionSoakMinPolls()
  if (statusLineCount < minPolls) {
    errors.push(`need at least ${minPolls} status lines, got ${statusLineCount}`)
  }
  if (!sawMpos) errors.push('missing MPos in status reports')
  if (!sawWpos) errors.push('missing WPos in status reports')
  if (!sawBuf) errors.push('missing Buf in status reports')

  return {
    ...base,
    ok: errors.length === 0,
    errors,
    sawMpos,
    sawWpos,
    sawFeed,
    sawBuf,
    statusLineCount,
  }
}
