import { describe, expect, it } from 'vitest'
import { submitSlaJob } from '@/api/sla'
import { slaGoldenCube10mm, SLA_CUBE_GOLDEN_OPTS, SLA_CUBE_PHOTON_SHA256, slaBlobStructuralDigest } from '@/core/sla/slaGoldenProfile'
import { getSlaWorkerStatus } from '@/core/sla/slaWorkerBridge'

describe('api/sla submitSlaJob', () => {
  it('sync path matches SLA-CUBE photon golden', async () => {
    const result = await submitSlaJob(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'photon',
      mode: 'export',
      forceSync: true,
    })
    expect(result.backend).toBe('sla-ts-mvp')
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_PHOTON_SHA256)
  })

  it('reports worker-runtime and wasm present', () => {
    const st = getSlaWorkerStatus()
    expect(st.mode).toBe('worker-runtime')
    expect(st.workerFilePresent).toBe(true)
    expect(st.wasmPresent).toBe(true)
  })
})
