import { describe, expect, it } from 'vitest'
import { evaluateTexturizerMigrationSoak } from './texturizerMigrationSoak'

describe('texturizerMigrationSoak', () => {
  it('medium mesh offline soak passes pinned golden', () => {
    const r = evaluateTexturizerMigrationSoak()
    expect(r.ok, r.errors.join('; ')).toBe(true)
    expect(r.mediumGoldenMatch).toBe(true)
  })
})
