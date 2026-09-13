import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluateSlaMigrationComplete } from './slaMigrationComplete'

describe('slaMigrationComplete', () => {
  it('passes SLA migration-complete gate', async () => {
    const r = await evaluateSlaMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.legacyCryptoVendored).toBe(true)
  })

  it('vendors x_ctb.js, x_ctb_crypto.js, and x_goo.js under legacy/work', () => {
    const work = resolve(process.cwd(), 'src/core/sla/legacy/work')
    expect(existsSync(resolve(work, 'x_ctb.js'))).toBe(true)
    expect(existsSync(resolve(work, 'x_ctb_crypto.js'))).toBe(true)
    expect(existsSync(resolve(work, 'x_goo.js'))).toBe(true)
  })
})
