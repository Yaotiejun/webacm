/**
 * HW-04..09 field sign-off checklist (software form).
 * Never auto-passes shop-floor criteria — only records env readiness + empty signature slots.
 */
import { evaluateHwSoakReadiness, type HwSoakReadinessResult } from './hwSoakReadiness'

export type HwFieldSignOffRow = {
  id: string
  label: string
  envVar: string
  envReady: boolean
  npmCommand: string
  passCriteria: string
  /** Filled only by human after shop-floor run. */
  signed: false
  signerSlot: string
}

export type HwFieldSignOffReport = {
  ok: true
  generatedAt: string
  readiness: HwSoakReadinessResult
  rows: HwFieldSignOffRow[]
  unsigned: string[]
  note: string
}

const ROWS: Omit<HwFieldSignOffRow, 'envReady' | 'signed'>[] = [
  {
    id: 'HW-04',
    label: 'Carvera device soak',
    envVar: 'CARVERA_SOAK_WS',
    npmCommand: 'DEVICE_PRODUCTION_SOAK=1 npm run soak:carvera',
    passCriteria: 'L/W/A/H + Buf stable; optional M495',
    signerSlot: 'shop-floor / operator',
  },
  {
    id: 'HW-05',
    label: 'GridBot device soak',
    envVar: 'GRIDBOT_SOAK_WS',
    npmCommand: 'DEVICE_PRODUCTION_SOAK=1 npm run soak:gridbot',
    passCriteria: 'M105/M114/Advanced OK',
    signerSlot: 'shop-floor / operator',
  },
  {
    id: 'HW-06',
    label: 'FDM live print',
    envVar: 'FDM_LIVE_MIGRATION',
    npmCommand: 'FDM_LIVE_MIGRATION=1 npm run soak:fdm:live',
    passCriteria: 'First-layer adhesion; dual-tool no crash; /fdm send OK',
    signerSlot: 'shop-floor / operator',
  },
  {
    id: 'HW-07',
    label: 'CAM live mill',
    envVar: 'CAM_LIVE_MIGRATION',
    npmCommand: 'CAM_LIVE_MIGRATION=1 npm run soak:cam:live',
    passCriteria: 'fingerprintMatch + path/stock match; Animate + send OK',
    signerSlot: 'shop-floor / operator',
  },
  {
    id: 'HW-08',
    label: 'Laser live cut',
    envVar: 'LASER_HW_SOAK',
    npmCommand: 'LASER_HW_SOAK=1 npm run soak:laser:live',
    passCriteria: '/laser SVG->slice->cut matches preview; no overburn',
    signerSlot: 'shop-floor / operator',
  },
  {
    id: 'HW-09',
    label: 'SLA live print',
    envVar: 'SLA_HW_SOAK',
    npmCommand: 'SLA_HW_SOAK=1 npm run soak:sla:live',
    passCriteria: 'Photon/CTB/GOO print OK; dimensions/appearance acceptable',
    signerSlot: 'shop-floor / operator',
  },
]

export function evaluateHwFieldSignOff(): HwFieldSignOffReport {
  const readiness = evaluateHwSoakReadiness()
  const rows: HwFieldSignOffRow[] = ROWS.map((r) => ({
    ...r,
    envReady: readiness.checks[r.id]?.envSet === true,
    signed: false as const,
  }))
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    readiness,
    rows,
    unsigned: rows.map((r) => r.id),
    note: 'Software never signs HW-04..09. Print this report and sign after shop-floor soak.',
  }
}
