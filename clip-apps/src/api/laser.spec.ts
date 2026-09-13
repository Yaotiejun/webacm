import { describe, expect, it } from 'vitest'
import { submitLaserJob } from '@/api/laser'
import {
  LASER_SVG_GOLDEN_DEVICE_ID,
  LASER_SVG_GOLDEN_PROCESS,
  LASER_SVG_GOLDEN_SHA256,
  LASER_SVG_GOLDEN_SVG,
  laserGcodeStructuralDigest,
} from '@/core/laser/laserGoldenProfile'
import { createHash } from 'node:crypto'
import { getLaserWorkerStatus } from '@/core/laser/laserWorkerBridge'

describe('api/laser submitLaserJob', () => {
  it('sync path matches LASER-SVG golden', async () => {
    const result = await submitLaserJob(
      { kind: 'svg', svgText: LASER_SVG_GOLDEN_SVG },
      {
        deviceId: LASER_SVG_GOLDEN_DEVICE_ID,
        process: { ...LASER_SVG_GOLDEN_PROCESS },
        forceSync: true,
      },
    )
    const sha = createHash('sha256')
      .update(laserGcodeStructuralDigest(result.gcodeText), 'utf8')
      .digest('hex')
    expect(sha).toBe(LASER_SVG_GOLDEN_SHA256)
    expect(result.backend).toBe('kiri-ts')
  })

  it('reports worker-runtime status', () => {
    const st = getLaserWorkerStatus()
    expect(st.mode).toBe('worker-runtime')
    expect(st.workerFilePresent).toBe(true)
    expect(st.apiPresent).toBe(true)
  })
})
