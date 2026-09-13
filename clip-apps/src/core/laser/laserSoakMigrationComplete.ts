/**
 * Phase 5 — Laser golden soak (offline).
 * File SHA pins: `npm run soak:laser`
 */
import { evaluateLaserMigrationComplete } from '@/core/laser/laserMigrationComplete'

export interface LaserSoakMigrationCompleteResult {
  ok: boolean
  checks: {
    migrationGate: boolean
    goldenSvg: boolean
    goldenDxf: boolean
    goldenSnapmaker: boolean
  }
  soakHint: string
  errors: string[]
}

export function evaluateLaserSoakMigrationComplete(): LaserSoakMigrationCompleteResult {
  const gate = evaluateLaserMigrationComplete()
  const errors = gate.ok ? [] : gate.errors.map((e) => `laser: ${e}`)
  return {
    ok: errors.length === 0,
    checks: {
      migrationGate: gate.ok,
      goldenSvg: gate.checks.goldenSvg,
      goldenDxf: gate.checks.goldenDxf,
      goldenSnapmaker: gate.checks.goldenSnapmaker,
    },
    soakHint: 'npm run soak:laser (laserGolden.soak structural SHA pins)',
    errors,
  }
}
