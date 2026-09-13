/**
 * HW-08 Laser live soak stub.
 * Skips unless LASER_HW_SOAK=1. Does not auto-sign shop-floor criteria.
 */
import { describe, expect, it } from 'vitest'
import { evaluateHwFieldSignOff } from '@/core/migration/hwFieldSignOff'
import { submitLaserJob } from '@/api/laser'
import {
  LASER_SVG_GOLDEN_DEVICE_ID,
  LASER_SVG_GOLDEN_PROCESS,
  LASER_SVG_GOLDEN_SVG,
} from '@/core/laser/laserGoldenProfile'

const enabled =
  process.env.LASER_HW_SOAK === '1' ||
  process.env.LASER_HW_SOAK === 'true' ||
  process.env.LASER_HW_SOAK === 'yes'

describe.skipIf(!enabled)('HW-08 laser live soak', () => {
  it('offline engine still produces gcode when HW soak env set', async () => {
    const r = await submitLaserJob(
      { kind: 'svg', svgText: LASER_SVG_GOLDEN_SVG },
      {
        deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
        process: { ...LASER_SVG_GOLDEN_PROCESS },
        forceSync: true,
      },
    )
    expect(r.gcodeText.length).toBeGreaterThan(20)
    const form = evaluateHwFieldSignOff()
    const row = form.rows.find((x) => x.id === 'HW-08')
    expect(row?.envReady).toBe(true)
    expect(row?.signed).toBe(false)
  })
})

describe('HW-08 laser live soak (always)', () => {
  it('documents skip when LASER_HW_SOAK unset', () => {
    if (enabled) return
    expect(enabled).toBe(false)
  })
})
