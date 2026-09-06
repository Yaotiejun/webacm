// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { evaluateTexturizerMigrationComplete } from './texturizerMigrationComplete'

describe('texturizerMigrationComplete', () => {
  it('passes migration-complete bundle (offline golden + STL export)', async () => {
    const r = await evaluateTexturizerMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.checks.offlineSoak).toBe(true)
    expect(r.checks.stlExportPipeline).toBe(true)
  })
})
