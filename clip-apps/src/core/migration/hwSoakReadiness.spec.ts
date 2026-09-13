import { describe, expect, it } from 'vitest'
import { evaluateHwSoakReadiness } from './hwSoakReadiness'

describe('hwSoakReadiness', () => {
  it('always ok:true and reports HW-04~09 structure when envs unset', () => {
    const prev = {
      CARVERA: process.env.CARVERA_SOAK_WS,
      GRIDBOT: process.env.GRIDBOT_SOAK_WS,
      FDM: process.env.FDM_LIVE_MIGRATION,
      CAM: process.env.CAM_LIVE_MIGRATION,
      LASER: process.env.LASER_HW_SOAK,
      SLA: process.env.SLA_HW_SOAK,
    }
    try {
      delete process.env.CARVERA_SOAK_WS
      delete process.env.GRIDBOT_SOAK_WS
      delete process.env.FDM_LIVE_MIGRATION
      delete process.env.CAM_LIVE_MIGRATION
      delete process.env.LASER_HW_SOAK
      delete process.env.SLA_HW_SOAK

      const r = evaluateHwSoakReadiness()
      expect(r.ok).toBe(true)
      expect(r.checks['HW-04']?.envVar).toBe('CARVERA_SOAK_WS')
      expect(r.checks['HW-05']?.envVar).toBe('GRIDBOT_SOAK_WS')
      expect(r.checks['HW-06']?.envVar).toBe('FDM_LIVE_MIGRATION')
      expect(r.checks['HW-07']?.envVar).toBe('CAM_LIVE_MIGRATION')
      expect(r.checks['HW-08']?.envVar).toBe('LASER_HW_SOAK')
      expect(r.checks['HW-09']?.envVar).toBe('SLA_HW_SOAK')
      expect(r.pending).toEqual(
        expect.arrayContaining(['HW-04', 'HW-05', 'HW-06', 'HW-07', 'HW-08', 'HW-09']),
      )
      expect(r.ready).toEqual([])
    } finally {
      for (const [k, v] of Object.entries({
        CARVERA_SOAK_WS: prev.CARVERA,
        GRIDBOT_SOAK_WS: prev.GRIDBOT,
        FDM_LIVE_MIGRATION: prev.FDM,
        CAM_LIVE_MIGRATION: prev.CAM,
        LASER_HW_SOAK: prev.LASER,
        SLA_HW_SOAK: prev.SLA,
      })) {
        if (v != null) process.env[k] = v
        else delete process.env[k]
      }
    }
  })

  it('marks ready when LASER_HW_SOAK=1', () => {
    const prev = process.env.LASER_HW_SOAK
    try {
      process.env.LASER_HW_SOAK = '1'
      const r = evaluateHwSoakReadiness()
      expect(r.ok).toBe(true)
      expect(r.checks['HW-08']?.envSet).toBe(true)
      expect(r.ready).toContain('HW-08')
    } finally {
      if (prev != null) process.env.LASER_HW_SOAK = prev
      else delete process.env.LASER_HW_SOAK
    }
  })
})
