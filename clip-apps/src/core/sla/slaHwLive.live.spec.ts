/**
 * HW-09 SLA live soak ? gated by SLA_HW_SOAK=1.
 * Runs full offline export matrix + official validate; never auto-signs.
 */
import { describe, expect, it } from 'vitest'
import { evaluateHwFieldSignOff } from '@/core/migration/hwFieldSignOff'
import { submitSlaJob } from '@/api/sla'
import { runSlaPrepare } from '@/core/sla/slaPrepareBridge'
import { evaluateSlaOfficialFormatValidate } from '@/core/sla/slaOfficialFormatValidate'
import { slaGoldenCube10mm, SLA_CUBE_GOLDEN_OPTS } from '@/core/sla/slaGoldenProfile'

const enabled =
  process.env.SLA_HW_SOAK === '1' ||
  process.env.SLA_HW_SOAK === 'true' ||
  process.env.SLA_HW_SOAK === 'yes'

describe.skipIf(!enabled)('HW-09 sla live soak', () => {
  it('prepare + photon/ctb/goo/encrypted + official harness', async () => {
    const prep = await runSlaPrepare()
    expect(prep.ok).toBe(true)

    for (const exportFormat of ['photon', 'ctb', 'ctb-encrypted', 'goo'] as const) {
      const r = await submitSlaJob(new Float32Array(slaGoldenCube10mm()), {
        ...SLA_CUBE_GOLDEN_OPTS,
        exportFormat,
        forceSync: true,
      })
      expect(r.layerCount).toBeGreaterThan(0)
      expect(r.blob.byteLength).toBeGreaterThan(32)
    }

    const fmt = await evaluateSlaOfficialFormatValidate()
    expect(fmt.ok, fmt.errors.join('; ')).toBe(true)
    expect(fmt.checks.prepareOk).toBe(true)
    expect(fmt.checks.fixturesWritten).toBe(true)

    const form = evaluateHwFieldSignOff()
    const row = form.rows.find((x) => x.id === 'HW-09')
    expect(row?.envReady).toBe(true)
    expect(row?.signed).toBe(false)
  }, 120_000)
})

describe('HW-09 sla live soak (always)', () => {
  it('documents skip when SLA_HW_SOAK unset', () => {
    if (enabled) return
    expect(enabled).toBe(false)
  })
})
