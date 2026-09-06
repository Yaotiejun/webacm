/**
 * Canonical migration scoreboard (grip → shape_cam).
 * Update row `completionPct` when a domain batch lands; totals recompute from weights.
 */

export interface MigrationDomainRow {
  id: string
  label: string
  weightPct: number
  completionPct: number
  evidence: string
  remaining: string
}

export const MIGRATION_SCOREBOARD_ROWS: readonly MigrationDomainRow[] = Object.freeze([
  {
    id: 'texturizer',
    label: 'Texturizer (stlTexturizer-main)',
    weightPct: 25,
    completionPct: 100,
    evidence:
      'migrationComplete gate (offline soak + STL pipeline); subdiv0–2; binary STL SHA-256',
    remaining: 'Optional `npm run soak:texturizer:live` on production STL',
  },
  {
    id: 'raster',
    label: 'Raster (raster-path-main)',
    weightPct: 20,
    completionPct: 100,
    evidence:
      'migrationComplete gate (path SHA 0.5/1/2 + flat CPU Z + STL pin); WebGPU tracing',
    remaining: 'Optional `golden:raster` / `golden:raster:stl-trace` on synced fixtures',
  },
  {
    id: 'cam',
    label: 'CAM (grid-apps)',
    weightPct: 20,
    completionPct: 100,
    evidence:
      'camMigrationComplete (bundled capture SHA/Z/motion/sections); compareLegacyCamExport',
    remaining: 'CAM_LIVE_MIGRATION=1 → `npm run soak:cam:live`; re-capture fixture when JSON changes',
  },
  {
    id: 'carvera',
    label: 'Carvera (carve-control)',
    weightPct: 12,
    completionPct: 100,
    evidence:
      'deviceBridgeMigrationComplete; production soak mock + ALARM/banner/S/P; `npm run soak:carvera`',
    remaining: 'Optional `npm run soak:carvera` on production TCP (`CARVERA_SOAK_WS`)',
  },
  {
    id: 'gridbot',
    label: 'GridBot (grid-bot)',
    weightPct: 8,
    completionPct: 100,
    evidence:
      'deviceBridgeMigrationComplete source sync; production soak; `npm run soak:gridbot`',
    remaining: 'Run `npm run soak:gridbot` on production TCP',
  },
  {
    id: 'backend',
    label: 'Shared backend (app-server/log/net)',
    weightPct: 10,
    completionPct: 100,
    evidence:
      'StaticRouter/WSS registry; module gate; compression stub; backendMigrationComplete',
    remaining: 'Optional production Connect deploy; compression negotiated in stub only',
  },
  {
    id: 'other',
    label: 'Other grip domains',
    weightPct: 5,
    completionPct: 100,
    evidence:
      'otherMigrationComplete: wattzup + basic-ftp inventoried out of product stream',
    remaining: 'Re-open only if clip-apps needs wattzup/FTP integration',
  },
])

export interface MigrationProgressTotals {
  strictTotalPct: number
  primaryProductPathPct: number
  weightedContributions: Record<string, number>
}

const PRIMARY_IDS = new Set(['texturizer', 'raster', 'cam', 'carvera', 'gridbot'])

export function computeMigrationProgressTotals(
  rows: readonly MigrationDomainRow[] = MIGRATION_SCOREBOARD_ROWS,
): MigrationProgressTotals {
  let strictSum = 0
  let primarySum = 0
  let primaryWeight = 0
  const weightedContributions: Record<string, number> = {}

  for (const row of rows) {
    const contrib = (row.weightPct * row.completionPct) / 100
    weightedContributions[row.id] = contrib
    strictSum += contrib
    if (PRIMARY_IDS.has(row.id)) {
      primarySum += contrib
      primaryWeight += row.weightPct
    }
  }

  return {
    strictTotalPct: Math.round(strictSum * 100) / 100,
    primaryProductPathPct:
      primaryWeight > 0 ? Math.round((primarySum / primaryWeight) * 10000) / 100 : 0,
    weightedContributions,
  }
}

export function formatMigrationProgressReport(
  opts: { migrationGatePassed?: number; migrationGateSkipped?: number } = {},
): string {
  const totals = computeMigrationProgressTotals()
  const lines: string[] = [
    '# shape_cam migration progress (computed)',
    '',
    '| Domain | Weight | Done | Contribution |',
    '|--------|-------:|-----:|-------------:|',
  ]
  for (const row of MIGRATION_SCOREBOARD_ROWS) {
    const c = totals.weightedContributions[row.id] ?? 0
    lines.push(`| ${row.label} | ${row.weightPct}% | ${row.completionPct}% | ${c.toFixed(2)}% |`)
  }
  lines.push('')
  lines.push(`**Strict full-scope total:** ${totals.strictTotalPct}%`)
  lines.push(`**Primary product path** (clip-apps + device-bridge): **${totals.primaryProductPathPct}%**`)
  if (opts.migrationGatePassed != null) {
    lines.push(
      `**Migration gate:** ${opts.migrationGatePassed} passed` +
        (opts.migrationGateSkipped ? `, ${opts.migrationGateSkipped} skipped` : ''),
    )
  }
  lines.push('')
  lines.push('## Remaining (P1)')
  const p1 = MIGRATION_SCOREBOARD_ROWS.filter((r) => PRIMARY_IDS.has(r.id) && r.completionPct < 85)
  if (p1.length === 0) {
    lines.push('- _(none — primary path at 100%)_')
  } else {
    for (const row of p1) {
      lines.push(`- **${row.label}** (${row.completionPct}%): ${row.remaining}`)
    }
  }
  lines.push('')
  lines.push('## Optional production / maintenance')
  for (const row of MIGRATION_SCOREBOARD_ROWS) {
    lines.push(`- **${row.label}**: ${row.remaining}`)
  }
  return lines.join('\n')
}
