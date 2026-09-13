/**
 * Carvera M495 probe / auto-level builder (carve-control `canvas.js` run_start parity).
 *
 * Firmware gotcha: for 3-axis stock top, always send O and F together.
 * O without F selects 4th-axis absolute Z probe.
 */

export type CarveraProbeMode = 'none' | 'z' | 'grid' | 'axis4'

export type CarveraM495Options = {
  mode: CarveraProbeMode
  /** Path / margin start (work coords). */
  startX?: number
  startY?: number
  /** Margin scan extents (C D). */
  marginX?: number
  marginY?: number
  /** Z-probe offset from start (O F) — 3-axis. */
  offsetO?: number
  offsetF?: number
  /** Grid auto-level rectangle (A B). */
  gridA?: number
  gridB?: number
  /** Grid point counts (I J). */
  gridI?: number
  gridJ?: number
  /** Z clearance between grid points (H). Default 3. */
  clearanceH?: number
  /** Return / path origin flag (P). */
  returnP?: number
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const r = Math.round(n * 1000) / 1000
  return String(r)
}

/**
 * Build compact M495 line (no spaces), matching carve-control wire style.
 */
export function buildCarveraM495(opts: CarveraM495Options): string {
  const x = opts.startX ?? 0
  const y = opts.startY ?? 0
  let line = `M495X${fmtNum(x)}Y${fmtNum(y)}`

  const mx = opts.marginX
  const my = opts.marginY
  if (mx != null && my != null && (mx > 0 || my > 0)) {
    line += `C${fmtNum(mx)}D${fmtNum(my)}`
  }

  if (opts.mode === 'axis4') {
    line += `O${fmtNum(opts.offsetO ?? 0)}`
    if (opts.returnP != null) line += `P${fmtNum(opts.returnP)}`
    else line += 'P1'
    return line
  }

  if (opts.mode === 'z' || opts.mode === 'grid') {
    // Always pair O+F for 3-axis
    line += `O${fmtNum(opts.offsetO ?? 0)}F${fmtNum(opts.offsetF ?? 0)}`
  }

  if (opts.mode === 'grid') {
    const a = opts.gridA ?? 100
    const b = opts.gridB ?? 80
    const i = Math.max(2, Math.floor(opts.gridI ?? 3))
    const j = Math.max(2, Math.floor(opts.gridJ ?? 3))
    const h = opts.clearanceH ?? 3
    line += `A${fmtNum(a)}B${fmtNum(b)}I${i}J${j}H${fmtNum(h)}`
  }

  if (opts.returnP != null && opts.mode !== 'none') {
    line += `P${fmtNum(opts.returnP)}`
  }

  return line
}

/** Prefix for SD play queue (carve-control `buffer M495…` then `play`). */
export function bufferCarveraM495(m495: string): string {
  const cmd = m495.trim()
  if (!cmd.toUpperCase().startsWith('M495')) {
    throw new Error(`buffer expects M495 line, got: ${cmd}`)
  }
  return `buffer ${cmd}`
}

export function validateCarveraM495Options(opts: CarveraM495Options): string[] {
  const warns: string[] = []
  if (opts.mode === 'grid') {
    if ((opts.gridI ?? 3) < 2 || (opts.gridJ ?? 3) < 2) {
      warns.push('grid I/J should be ≥ 2')
    }
  }
  if (opts.mode === 'z' || opts.mode === 'grid') {
    // builder always pairs O/F; keep as documentation guard
  }
  return warns
}
