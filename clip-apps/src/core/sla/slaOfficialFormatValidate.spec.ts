import { describe, expect, it } from 'vitest'
import { evaluateSlaOfficialFormatValidate } from './slaOfficialFormatValidate'

describe('slaOfficialFormatValidate', () => {
  it('self-validates CTB/GOO + sla_prepare and writes fixtures', async () => {
    delete process.env.SLA_OFFICIAL_CTB_PATH
    delete process.env.SLA_OFFICIAL_GOO_PATH
    delete process.env.SLA_OFFICIAL_REQUIRE
    const r = await evaluateSlaOfficialFormatValidate()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.selfCtbV3).toBe(true)
    expect(r.checks.selfCtbEncrypted).toBe(true)
    expect(r.checks.selfGoo).toBe(true)
    expect(r.checks.prepareOk).toBe(true)
    expect(r.checks.fixturesWritten).toBe(true)
  })
})
