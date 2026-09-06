import { describe, expect, it } from 'vitest'
import {
  buildCanonicalFdmLegacyBundle,
  evaluateFdmLegacyMigrationComplete,
} from './fdmLegacyMigrationComplete'
import { sha256HexUtf8 } from '@/core/cam/camGcodeFingerprint'

describe('fdmLegacyMigrationComplete', () => {
  it('passes FDM legacy comparison migration gate', async () => {
    const r = await evaluateFdmLegacyMigrationComplete()
    expect(r.ok, r.errors.join('; ')).toBe(true)
  })

  it('canonical bundle SHA is stable', async () => {
    const a = await sha256HexUtf8(buildCanonicalFdmLegacyBundle())
    const b = await sha256HexUtf8(buildCanonicalFdmLegacyBundle())
    expect(a).toBe(b)
    expect(a).toMatch(/^[a-f0-9]{64}$/)
  })
})
