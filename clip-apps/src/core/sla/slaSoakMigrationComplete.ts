/**
 * Phase 6 — SLA golden soak (offline).
 * File SHA pins: `npm run soak:sla`
 */
import { evaluateSlaMigrationComplete } from '@/core/sla/slaMigrationComplete'

export interface SlaSoakMigrationCompleteResult {
  ok: boolean
  checks: {
    migrationGate: boolean
    goldenPhoton: boolean
    goldenCtb: boolean
    goldenGoo: boolean
  }
  soakHint: string
  errors: string[]
}

export async function evaluateSlaSoakMigrationComplete(): Promise<SlaSoakMigrationCompleteResult> {
  const gate = await evaluateSlaMigrationComplete()
  const errors = gate.ok ? [] : gate.errors.map((e) => `sla: ${e}`)
  return {
    ok: errors.length === 0,
    checks: {
      migrationGate: gate.ok,
      goldenPhoton: gate.checks.goldenPhoton,
      goldenCtb: gate.checks.goldenCtb,
      goldenGoo: gate.checks.goldenGoo,
    },
    soakHint: 'npm run soak:sla (slaGolden.soak Photon/CTB/GOO SHA pins)',
    errors,
  }
}
