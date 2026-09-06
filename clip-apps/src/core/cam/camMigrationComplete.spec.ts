import { describe, expect, it } from 'vitest'
import { evaluateCamMigrationComplete } from './camMigrationComplete'

describe('camMigrationComplete', () => {
  it('passes bundled grip capture migration gate', async () => {
    const r = await evaluateCamMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })
})
