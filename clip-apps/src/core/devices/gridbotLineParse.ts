export type GridbotTempSnapshot = {
  nozzle: number | null
  bed: number | null
  nozzleTarget: number | null
  bedTarget: number | null
}

export type GridbotPosSnapshot = { x: number; y: number; z: number; e: number }

/** grip `server.js` sensor line normalization before M105 token split */
export function normalizeGridbotSensorLine(line: string): string {
  return line
    .replace(/TT:/g, 'T:')
    .replace(/BB:/g, 'B:')
    .replace(/::/g, ':')
    .replace(/\/\//g, '/')
    .replace(/ +\//g, '/')
}

export function stripGridbotOkPrefix(line: string): string {
  const t = line.trim()
  return /^ok\b/i.test(t) ? t.replace(/^ok\s+/i, '') : t
}

export function parseGridbotM105Line(line: string): GridbotTempSnapshot | null {
  const payload = stripGridbotOkPrefix(normalizeGridbotSensorLine(line))
  const nozzle = payload.match(/\bT\d?:\s*([0-9.]+)(?:\s*\/\s*([0-9.]+))?/i)
  const bed = payload.match(/\bB:\s*([0-9.]+)(?:\s*\/\s*([0-9.]+))?/i)
  if (!nozzle && !bed) return null
  return {
    nozzle: nozzle ? Number(nozzle[1]) : null,
    nozzleTarget: nozzle?.[2] != null ? Number(nozzle[2]) : null,
    bed: bed ? Number(bed[1]) : null,
    bedTarget: bed?.[2] != null ? Number(bed[2]) : null,
  }
}

export function parseGridbotM114Line(line: string): GridbotPosSnapshot | null {
  const payload = stripGridbotOkPrefix(line.trim())
  const m = payload.match(/\bX:\s*([+-]?[0-9.]+)\s+Y:\s*([+-]?[0-9.]+)\s+Z:\s*([+-]?[0-9.]+)\s+E:\s*([+-]?[0-9.]+)/i)
  if (!m) return null
  return { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]), e: Number(m[4]) }
}

export function parseGridbotErrorLine(line: string): string | null {
  const t = line.trim()
  if (/^error:/i.test(t)) return t.replace(/^error:\s*/i, '').trim()
  return null
}

/** grip resend handler (`Resend: N`) */
export function parseGridbotResendLine(line: string): number | null {
  const m = line.trim().match(/^resend:\s*(\d+)/i)
  return m ? Number(m[1]) : null
}

export function isGridbotOkLine(line: string): boolean {
  return /^ok\b/i.test(line.trim())
}
