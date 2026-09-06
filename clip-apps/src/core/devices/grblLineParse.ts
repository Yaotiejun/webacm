export type GrblMachineCoords = { x?: number; y?: number; z?: number; a?: number }
export type GrblSpindleState = { spindleOn?: boolean; spindleRpm?: number }
export type GrblRunState = 'IDLE' | 'RUN' | 'PAUSE' | 'ALARM' | 'HOLD' | 'DOOR'

export type GrblFeedState = {
  current?: number
  target?: number
  overridePct?: number
}

/** carve-control `L:` — current, target, scale, ? */
export type GrblLaserState = {
  current?: number
  target?: number
  scale?: number
  extra?: number
}

/** carve-control `W:` — probe voltage (not `WPos`). */
export type GrblProbeState = {
  voltage?: number
}

/** carve-control `S:` — spindle current, target, scale, ? */
export type GrblSpinState = {
  current?: number
  target?: number
  scale?: number
  extra?: number
}

/** carve-control `P:` — job play line, percent, seconds */
export type GrblPlayState = {
  line?: number
  percent?: number
  seconds?: number
}

/** carve-control `A:` — job setup / tool-change prep */
export type GrblSetupState = {
  state?: number
}

/** carve-control `H:` — halt condition code */
export type GrblHaltState = {
  code?: number
}

export type GrblStatusReport = {
  mpos?: GrblMachineCoords
  wpos?: GrblMachineCoords
  feed?: GrblFeedState
  laser?: GrblLaserState
  probe?: GrblProbeState
  spin?: GrblSpinState
  play?: GrblPlayState
  setup?: GrblSetupState
  halt?: GrblHaltState
  buf?: number
  runState?: GrblRunState
}

export function parseGrblAxisLine(line: string): GrblMachineCoords | null {
  const xMatch = line.match(/X(-?\d+(?:\.\d+)?)/i)
  const yMatch = line.match(/Y(-?\d+(?:\.\d+)?)/i)
  const zMatch = line.match(/Z(-?\d+(?:\.\d+)?)/i)
  if (!xMatch && !yMatch && !zMatch) return null
  const next: GrblMachineCoords = {}
  if (xMatch) next.x = Number(xMatch[1])
  if (yMatch) next.y = Number(yMatch[1])
  if (zMatch) next.z = Number(zMatch[1])
  return next
}

export function parseGrblSpindleLine(line: string): GrblSpindleState | null {
  const next: GrblSpindleState = {}
  let changed = false
  const sMatch = line.match(/S(\d+(?:\.\d+)?)/i)
  if (sMatch) {
    next.spindleRpm = Number(sMatch[1])
    if (next.spindleRpm > 0) next.spindleOn = true
    changed = true
  }
  if (/M3\b/i.test(line) || /M4\b/i.test(line)) {
    next.spindleOn = true
    changed = true
  }
  if (/M5\b/i.test(line)) {
    next.spindleOn = false
    changed = true
  }
  return changed ? next : null
}

function parseGrblCoordTriple(
  text: string,
  prefix: 'MPos' | 'WPos',
): GrblMachineCoords | undefined {
  const re = new RegExp(`${prefix}:([-\\d.]+),([-\\d.]+),([-\\d.]+)(?:,([-\\d.]+))?`)
  const m = text.match(re)
  if (!m) return undefined
  const out: GrblMachineCoords = {
    x: Number(m[1]),
    y: Number(m[2]),
    z: Number(m[3]),
  }
  if (m[4] != null) out.a = Number(m[4])
  return out
}

/** Parses `<Idle|MPos:0,0,0|WPos:0,0,0|FS:0,0|...>` (carve-control / Grbl). */
export function parseGrblStatusReport(line: string): GrblStatusReport | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('<') || !trimmed.endsWith('>')) return null
  const lower = trimmed.toLowerCase()
  const out: GrblStatusReport = {}

  const mpos = parseGrblCoordTriple(trimmed, 'MPos')
  if (mpos) out.mpos = mpos

  const wpos = parseGrblCoordTriple(trimmed, 'WPos')
  if (wpos) out.wpos = wpos

  const fs = trimmed.match(/FS:([\d.]+),([\d.]+)(?:,([\d.]+))?/i)
  if (fs) {
    out.feed = {
      current: Number(fs[1]),
      target: Number(fs[2]),
    }
    if (fs[3] != null) out.feed.overridePct = Number(fs[3])
  } else {
    const fOnly = trimmed.match(/\|F:([\d.]+)/i)
    if (fOnly) out.feed = { current: Number(fOnly[1]) }
  }

  const buf = trimmed.match(/Buf:(\d+)/i)
  if (buf) out.buf = Number(buf[1])

  const laser = trimmed.match(/\|L:([\d.]+),([\d.]+)(?:,([\d.]+)(?:,([\d.]+))?)?/i)
  if (laser) {
    out.laser = {
      current: Number(laser[1]),
      target: Number(laser[2]),
    }
    if (laser[3] != null) out.laser.scale = Number(laser[3])
    if (laser[4] != null) out.laser.extra = Number(laser[4])
  }

  const probe = trimmed.match(/\|W:([-\d.]+)(?=\||>)/i)
  if (probe) out.probe = { voltage: Number(probe[1]) }

  const spin = trimmed.match(/\|S:([\d.]+),([\d.]+)(?:,([\d.]+)(?:,([\d.]+))?)?/i)
  if (spin) {
    out.spin = {
      current: Number(spin[1]),
      target: Number(spin[2]),
    }
    if (spin[3] != null) out.spin.scale = Number(spin[3])
    if (spin[4] != null) out.spin.extra = Number(spin[4])
  }

  const play = trimmed.match(/\|P:([\d.]+),([\d.]+),([\d.]+)/i)
  if (play) {
    out.play = {
      line: Number(play[1]),
      percent: Number(play[2]),
      seconds: Number(play[3]),
    }
  }

  const setup = trimmed.match(/\|A:([\d.]+)/i)
  if (setup) out.setup = { state: Number(setup[1]) }

  const halt = trimmed.match(/\|H:([\d.]+)/i)
  if (halt) out.halt = { code: Number(halt[1]) }

  if (lower.includes('alarm')) out.runState = 'ALARM'
  else if (lower.includes('door')) out.runState = 'DOOR'
  else if (lower.includes('idle')) out.runState = 'IDLE'
  else if (lower.includes('run')) out.runState = 'RUN'
  else if (lower.includes('hold')) out.runState = 'HOLD'
  else if (lower.includes('pause') || lower.includes('jog')) out.runState = 'PAUSE'

  if (
    !out.mpos &&
    !out.wpos &&
    !out.feed &&
    !out.laser &&
    !out.probe &&
    !out.spin &&
    !out.play &&
    !out.setup &&
    !out.halt &&
    out.buf == null &&
    !out.runState
  ) {
    return null
  }
  return out
}

/** Grbl / carve-control `ALARM:N` (e.g. homing fail `ALARM:9`). */
export function parseGrblAlarmLine(line: string): number | null {
  const m = line.trim().match(/^ALARM:(\d+)/i)
  return m ? Number(m[1]) : null
}

/** Opening banner `Grbl 1.1h ['$' for help]`. */
export function parseGrblBannerLine(line: string): { version: string } | null {
  const m = line.trim().match(/^Grbl\s+(\S+)/i)
  return m ? { version: m[1]! } : null
}

/** carve-control `error:N` lines */
export function parseGrblErrorLine(line: string): string | null {
  const m = line.trim().match(/^error:\s*(.+)$/i)
  return m ? m[1].trim() : null
}
