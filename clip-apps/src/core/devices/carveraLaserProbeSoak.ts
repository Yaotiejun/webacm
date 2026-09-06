import { parseGrblStatusReport, type GrblStatusReport } from '@/core/devices/grblLineParse'

export interface CarveraLaserProbeSoakSample {
  line: string
  parsed: GrblStatusReport | null
  at: number
}

export interface CarveraLaserProbeSoakResult {
  ok: boolean
  pollCount: number
  sawLaser: boolean
  sawProbe: boolean
  sawSetup: boolean
  sawHalt: boolean
  lastLaser?: { current?: number; target?: number; scale?: number }
  lastProbeVoltage?: number
  lastSetupState?: number
  lastHaltCode?: number
  errors: string[]
}

export function carveraSoakWebSocketUrl(): string | null {
  const url = process.env.CARVERA_SOAK_WS?.trim()
  return url || null
}

export function isCarveraLaserProbeSoakEnabled(): boolean {
  return carveraSoakWebSocketUrl() != null
}

/** Evaluate collected `?` status polls (grip carve-control `L:` / `W:` fields). */
export function evaluateCarveraLaserProbeSoak(
  samples: readonly CarveraLaserProbeSoakSample[],
): CarveraLaserProbeSoakResult {
  const errors: string[] = []
  let sawLaser = false
  let sawProbe = false
  let sawSetup = false
  let sawHalt = false
  let lastLaser: CarveraLaserProbeSoakResult['lastLaser']
  let lastProbeVoltage: number | undefined
  let lastSetupState: number | undefined
  let lastHaltCode: number | undefined
  let statusLines = 0

  for (const sample of samples) {
    if (!sample.line.startsWith('<') || !sample.line.endsWith('>')) continue
    statusLines += 1
    const parsed = sample.parsed ?? parseGrblStatusReport(sample.line)
    if (!parsed) {
      errors.push(`unparseable status: ${sample.line.slice(0, 120)}`)
      continue
    }
    if (parsed.laser) {
      sawLaser = true
      lastLaser = parsed.laser
    }
    if (parsed.probe?.voltage != null && Number.isFinite(parsed.probe.voltage)) {
      sawProbe = true
      lastProbeVoltage = parsed.probe.voltage
    }
    if (parsed.setup?.state != null && Number.isFinite(parsed.setup.state)) {
      sawSetup = true
      lastSetupState = parsed.setup.state
    }
    if (parsed.halt?.code != null && Number.isFinite(parsed.halt.code)) {
      sawHalt = true
      lastHaltCode = parsed.halt.code
    }
  }

  if (statusLines === 0) errors.push('no grbl status lines (<...>) received')
  if (!sawLaser) errors.push('missing L: laser field in status reports')
  if (!sawProbe) errors.push('missing W: probe voltage in status reports')
  if (!sawSetup) errors.push('missing A: setup field in status reports')
  if (!sawHalt) errors.push('missing H: halt field in status reports')

  return {
    ok: errors.length === 0,
    pollCount: samples.length,
    sawLaser,
    sawProbe,
    sawSetup,
    sawHalt,
    lastLaser,
    lastProbeVoltage,
    lastSetupState,
    lastHaltCode,
    errors,
  }
}
