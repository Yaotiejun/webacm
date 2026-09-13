/**
 * HW-04~09 live soak readiness report (env presence only — never fails CI when unset).
 */
export type HwSoakCheck = {
  id: string
  label: string
  envVar: string
  envSet: boolean
  note: string
}

export type HwSoakReadinessResult = {
  ok: true
  checks: Record<string, HwSoakCheck>
  ready: string[]
  pending: string[]
}

function envOn(name: string): boolean {
  const v = process.env[name]
  return v === '1' || v === 'true' || v === 'yes'
}

function envPresent(name: string): boolean {
  const v = process.env[name]
  return typeof v === 'string' && v.trim().length > 0
}

export function evaluateHwSoakReadiness(): HwSoakReadinessResult {
  const checks: Record<string, HwSoakCheck> = {
    'HW-04': {
      id: 'HW-04',
      label: 'Carvera device soak',
      envVar: 'CARVERA_SOAK_WS',
      envSet: envPresent('CARVERA_SOAK_WS'),
      note: 'Needs CARVERA_SOAK_WS=ws://… + npm run soak:carvera (DEVICE_PRODUCTION_SOAK=1)',
    },
    'HW-05': {
      id: 'HW-05',
      label: 'GridBot device soak',
      envVar: 'GRIDBOT_SOAK_WS',
      envSet: envPresent('GRIDBOT_SOAK_WS'),
      note: 'Needs GRIDBOT_SOAK_WS=ws://… + npm run soak:gridbot (DEVICE_PRODUCTION_SOAK=1)',
    },
    'HW-06': {
      id: 'HW-06',
      label: 'FDM live print',
      envVar: 'FDM_LIVE_MIGRATION',
      envSet: envOn('FDM_LIVE_MIGRATION'),
      note: 'Needs device + npm run soak:fdm:live when FDM_LIVE_MIGRATION=1; skip when unset',
    },
    'HW-07': {
      id: 'HW-07',
      label: 'CAM live mill / export',
      envVar: 'CAM_LIVE_MIGRATION',
      envSet: envOn('CAM_LIVE_MIGRATION'),
      note: 'Needs CAM_LIVE_MIGRATION=1 + npm run soak:cam:live (optional VITE_KIRI_LEGACY_CAM=1)',
    },
    'HW-08': {
      id: 'HW-08',
      label: 'Laser live cut',
      envVar: 'LASER_HW_SOAK',
      envSet: envOn('LASER_HW_SOAK'),
      note: 'Field: LASER_HW_SOAK=1 then /laser cut soak; offline npm run soak:laser always',
    },
    'HW-09': {
      id: 'HW-09',
      label: 'SLA live print',
      envVar: 'SLA_HW_SOAK',
      envSet: envOn('SLA_HW_SOAK'),
      note: 'Field: SLA_HW_SOAK=1 then /sla resin soak; offline npm run soak:sla always; CTB/GOO need ChiTu/Elegoo validation',
    },
  }

  const ready: string[] = []
  const pending: string[] = []
  for (const c of Object.values(checks)) {
    if (c.envSet) ready.push(c.id)
    else pending.push(c.id)
  }

  return { ok: true, checks, ready, pending }
}
