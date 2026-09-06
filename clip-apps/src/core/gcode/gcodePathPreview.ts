/**
 * Minimal G-code → polyline for workspace preview (WCS X/Y/Z).
 * G0/G1 with G90/G91; G2/G3 tessellated per G17/G18/G19 plane (I/J/K/R).
 */

import { tessellateGcodeArc, type GcodeArcPlane } from './gcodeArcTessellate'

export type GcodePathSegmentKind = 'rapid' | 'cut'

export interface GcodePathSegment {
  kind: GcodePathSegmentKind
  positions: Float32Array
  vertexCount: number
}

export interface GcodePathEndPosition {
  x: number
  y: number
  z: number
}

export interface GcodePathBuildResult {
  positions: Float32Array
  segments: GcodePathSegment[]
  endPosition: GcodePathEndPosition
  rapidVertexCount: number
  cutVertexCount: number
  tessellatedArcs: number
  skippedArcs: number
  linesScanned: number
  vertexCount: number
}

const DEFAULT_MAX_LINES = 200_000
const DEFAULT_MAX_VERTICES = 120_000
const ARC_DIVS_PER_PI = 24

function stripInlineComments(line: string): string {
  return line.replace(/\([^)]*\)/g, '').trim()
}

function tokenizeGcodeLine(line: string): string[] {
  const compact = line.toUpperCase().replace(/\s+/g, '')
  if (!compact) return []
  const tokens: string[] = []
  const re = /([A-Z])(-?\d+(?:\.\d+)?(?:E[-+]?\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(compact)) !== null) {
    tokens.push(m[1]! + m[2]!)
  }
  return tokens
}

function parseAxisToken(tok: string): { axis: 'X' | 'Y' | 'Z'; value: number } | null {
  const m = tok.match(/^([XYZ])(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)$/i)
  if (!m) return null
  const axis = m[1]!.toUpperCase() as 'X' | 'Y' | 'Z'
  if (axis !== 'X' && axis !== 'Y' && axis !== 'Z') return null
  const value = Number(m[2])
  if (!Number.isFinite(value)) return null
  return { axis, value }
}

function parseArcOffsetToken(tok: string): { axis: 'I' | 'J' | 'K' | 'R'; value: number } | null {
  const m = tok.match(/^([IJKR])(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)$/i)
  if (!m) return null
  const axis = m[1]!.toUpperCase() as 'I' | 'J' | 'K' | 'R'
  const value = Number(m[2])
  if (!Number.isFinite(value)) return null
  return { axis, value }
}

function isRapidToken(tok: string): boolean {
  const u = tok.toUpperCase()
  return u === 'G0' || u === 'G00'
}

function isLinearToken(tok: string): boolean {
  const u = tok.toUpperCase()
  return u === 'G1' || u === 'G01'
}

function isArcToken(tok: string): boolean {
  const u = tok.toUpperCase()
  return u === 'G2' || u === 'G02' || u === 'G3' || u === 'G03'
}

function isArcClockwise(tokens: string[]): boolean {
  return tokens.some((t) => {
    const u = t.toUpperCase()
    return u === 'G2' || u === 'G02'
  })
}

function parsePlaneToken(tok: string): GcodeArcPlane | null {
  const u = tok.toUpperCase()
  if (u === 'G17') return 'xy'
  if (u === 'G18') return 'xz'
  if (u === 'G19') return 'yz'
  return null
}

function pushVertex(buf: number[], x: number, y: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return
  buf.push(x, y, z)
}

function ensureStripContinues(buf: number[], x: number, y: number, z: number) {
  if (buf.length === 0) pushVertex(buf, x, y, z)
}

function flushSegment(
  buf: number[],
  kind: GcodePathSegmentKind | null,
  segments: GcodePathSegment[],
  totals: { rapid: number; cut: number },
) {
  if (!kind || buf.length < 6) return
  const positions = new Float32Array(buf)
  const vertexCount = buf.length / 3
  segments.push({ kind, positions, vertexCount })
  if (kind === 'rapid') totals.rapid += vertexCount
  else totals.cut += vertexCount
}

export function buildGcodePathPositions(
  gcode: string,
  opts?: { maxLines?: number; maxVertices?: number },
): GcodePathBuildResult {
  const maxLines = opts?.maxLines ?? DEFAULT_MAX_LINES
  const maxVertices = opts?.maxVertices ?? DEFAULT_MAX_VERTICES
  const buf: number[] = []
  const segments: GcodePathSegment[] = []
  const segmentTotals = { rapid: 0, cut: 0 }
  let segmentKind: GcodePathSegmentKind | null = null
  let segmentBuf: number[] = []
  let px = 0
  let py = 0
  let pz = 0
  let abs = true
  let plane: GcodeArcPlane = 'xy'
  let skippedArcs = 0
  let tessellatedArcs = 0
  let linesScanned = 0

  const beginSegment = (kind: GcodePathSegmentKind, x: number, y: number, z: number) => {
    if (segmentKind !== kind) {
      flushSegment(segmentBuf, segmentKind, segments, segmentTotals)
      segmentKind = kind
      segmentBuf = []
      pushVertex(segmentBuf, x, y, z)
    }
  }

  const pushSegmentVertex = (kind: GcodePathSegmentKind, x: number, y: number, z: number) => {
    beginSegment(kind, px, py, pz)
    pushVertex(segmentBuf, x, y, z)
  }

  const lines = gcode.split(/\r?\n/)
  for (let li = 0; li < lines.length && li < maxLines; li += 1) {
    let line = lines[li]!.trim()
    if (!line) continue
    if (line.startsWith(';')) continue
    line = stripInlineComments(line)
    if (!line) continue
    linesScanned += 1

    const tokens = tokenizeGcodeLine(line)

    let cmd: 'rapid' | 'linear' | 'arc' | null = null
    if (tokens.some(isRapidToken)) cmd = 'rapid'
    else if (tokens.some(isLinearToken)) cmd = 'linear'
    else if (tokens.some(isArcToken)) cmd = 'arc'

    if (tokens.includes('G90')) abs = true
    if (tokens.includes('G91')) abs = false
    for (const tok of tokens) {
      const p = parsePlaneToken(tok)
      if (p) plane = p
    }

    let nx = px
    let ny = py
    let nz = pz
    let iOff: number | undefined
    let jOff: number | undefined
    let kOff: number | undefined
    let rOff: number | undefined

    for (const tok of tokens) {
      const ax = parseAxisToken(tok)
      if (ax) {
        const v = ax.value
        if (abs) {
          if (ax.axis === 'X') nx = v
          if (ax.axis === 'Y') ny = v
          if (ax.axis === 'Z') nz = v
        } else {
          if (ax.axis === 'X') nx += v
          if (ax.axis === 'Y') ny += v
          if (ax.axis === 'Z') nz += v
        }
        continue
      }
      const arc = parseArcOffsetToken(tok)
      if (arc) {
        if (arc.axis === 'I') iOff = arc.value
        if (arc.axis === 'J') jOff = arc.value
        if (arc.axis === 'K') kOff = arc.value
        if (arc.axis === 'R') rOff = arc.value
      }
    }

    if (cmd === 'arc') {
      const tess = tessellateGcodeArc({
        start: { x: px, y: py, z: pz },
        end: { x: nx, y: ny, z: nz },
        clockwise: isArcClockwise(tokens),
        plane,
        i: iOff,
        j: jOff,
        k: kOff,
        r: rOff,
        arcmotionDivsPerPi: ARC_DIVS_PER_PI,
      })
      if (tess && (tess.points.length > 0 || nx !== px || ny !== py || nz !== pz)) {
        tessellatedArcs += 1
        ensureStripContinues(buf, px, py, pz)
        beginSegment('cut', px, py, pz)
        for (const p of tess.points) {
          pushVertex(buf, p.x, p.y, p.z)
          pushVertex(segmentBuf, p.x, p.y, p.z)
          if (buf.length / 3 >= maxVertices) break
        }
        if (buf.length / 3 < maxVertices && (nx !== px || ny !== py || nz !== pz)) {
          pushVertex(buf, nx, ny, nz)
          pushVertex(segmentBuf, nx, ny, nz)
        }
      } else {
        skippedArcs += 1
      }
      px = nx
      py = ny
      pz = nz
      if (buf.length / 3 >= maxVertices) break
      continue
    }

    if (cmd === 'rapid' || cmd === 'linear') {
      if (nx !== px || ny !== py || nz !== pz) {
        const moveKind: GcodePathSegmentKind = cmd === 'rapid' ? 'rapid' : 'cut'
        ensureStripContinues(buf, px, py, pz)
        pushSegmentVertex(moveKind, nx, ny, nz)
        pushVertex(buf, nx, ny, nz)
        px = nx
        py = ny
        pz = nz
        if (buf.length / 3 >= maxVertices) break
      }
    }
  }

  flushSegment(segmentBuf, segmentKind, segments, segmentTotals)

  return {
    positions: new Float32Array(buf),
    segments,
    endPosition: { x: px, y: py, z: pz },
    rapidVertexCount: segmentTotals.rapid,
    cutVertexCount: segmentTotals.cut,
    tessellatedArcs,
    skippedArcs,
    linesScanned,
    vertexCount: buf.length / 3,
  }
}
