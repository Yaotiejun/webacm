import { describe, expect, it } from 'vitest'
import { tryParseWsSettingsRecord } from './wsSettingsRecord'

describe('api.wsSettingsRecord.tryParseWsSettingsRecord', () => {
  it('returns null for null or empty string', () => {
    expect(tryParseWsSettingsRecord(null)).toBeNull()
    expect(tryParseWsSettingsRecord('')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(tryParseWsSettingsRecord('{x')).toBeNull()
  })

  it('returns null for JSON array root', () => {
    expect(tryParseWsSettingsRecord('[]')).toBeNull()
  })

  it('returns null for JSON primitive roots', () => {
    expect(tryParseWsSettingsRecord('42')).toBeNull()
    expect(tryParseWsSettingsRecord('true')).toBeNull()
    expect(tryParseWsSettingsRecord('"hi"')).toBeNull()
  })

  it('returns null for JSON null', () => {
    expect(tryParseWsSettingsRecord('null')).toBeNull()
  })

  it('returns object for empty object', () => {
    const o = tryParseWsSettingsRecord('{}')
    expect(o).toEqual({})
  })

  it('returns plain object preserving keys', () => {
    const o = tryParseWsSettingsRecord('{"filter":{"FDM":"D"},"x":1}')
    expect(o).toEqual({ filter: { FDM: 'D' }, x: 1 })
  })
})
