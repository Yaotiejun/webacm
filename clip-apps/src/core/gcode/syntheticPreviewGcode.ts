export type SyntheticPreviewPoint = { x: number; y: number; z: number }

export type SyntheticPreviewPointGroup = {
  comment?: string
  points: SyntheticPreviewPoint[]
}

export type BuildSyntheticPreviewGcodeOptions = {
  headerComment: string
  groups: SyntheticPreviewPointGroup[]
  maxGroups?: number
  maxPoints?: number
  /** First move: all axes in one G0, or Z then XY (FDM layer style). */
  firstMove?: 'xyz' | 'z-then-xy'
}

function emitMotion(
  lines: string[],
  state: { started: boolean },
  p: SyntheticPreviewPoint,
  firstMove: 'xyz' | 'z-then-xy',
) {
  const { x, y, z } = p
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return
  if (!state.started) {
    if (firstMove === 'z-then-xy') {
      lines.push(`G0 Z${z.toFixed(4)}`)
      lines.push(`G0 X${x.toFixed(4)} Y${y.toFixed(4)}`)
    } else {
      lines.push(`G0 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)}`)
    }
    state.started = true
  } else {
    lines.push(`G1 X${x.toFixed(4)} Y${y.toFixed(4)} Z${z.toFixed(4)}`)
  }
}

/**
 * Shared G0/G1 synthesizer for workspace preview polylines (not for machining).
 */
export function buildSyntheticPreviewGcode(opts: BuildSyntheticPreviewGcodeOptions): string {
  const groups = opts.groups
  if (!groups.length) return ''

  const maxGroups = Math.max(1, opts.maxGroups ?? 500)
  const maxPoints = Math.max(4, opts.maxPoints ?? 12000)
  const firstMove = opts.firstMove ?? 'xyz'

  const lines: string[] = ['G21', 'G90', `; ${opts.headerComment}`]
  const state = { started: false }
  let count = 0

  for (let gi = 0; gi < groups.length && gi < maxGroups; gi += 1) {
    const group = groups[gi]!
    if (group.comment) lines.push(`; ${group.comment}`)
    // New feature/path → lift/reposition with G0 (do not stitch G1 across paths).
    state.started = false
    for (const p of group.points) {
      if (count >= maxPoints) break
      emitMotion(lines, state, p, firstMove)
      count += 1
    }
    if (count >= maxPoints) break
  }

  return lines.join('\n')
}
