import { describe, expect, it } from 'vitest'
import {
  TEXTURIZER_WARNING_CODES,
  TEXTURIZER_WARNING_DETAIL_KEYS,
  TEXTURIZER_WARNING_MESSAGE_MAP,
} from './texturizerWarnings'

function collectNestedStrings(obj: unknown): string[] {
  const out: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === 'string') out.push(v)
    else if (v && typeof v === 'object' && !Array.isArray(v)) for (const x of Object.values(v)) walk(x)
  }
  walk(obj)
  return out
}

describe('types.texturizerWarnings', () => {
  it('uses non-empty unique warning code string values', () => {
    const vals = Object.values(TEXTURIZER_WARNING_CODES)
    for (const v of vals) {
      expect(v.trim().length, v).toBeGreaterThan(0)
    }
    expect(new Set(vals).size).toBe(vals.length)
  })

  it('maps every declared code to a non-empty user-facing message', () => {
    for (const code of Object.values(TEXTURIZER_WARNING_CODES)) {
      const msg = TEXTURIZER_WARNING_MESSAGE_MAP[code]
      expect(typeof msg, code).toBe('string')
      expect(msg!.trim().length, code).toBeGreaterThan(0)
    }
  })

  it('does not map unknown keys beyond declared codes (migration guard)', () => {
    const codes = new Set(Object.values(TEXTURIZER_WARNING_CODES))
    for (const key of Object.keys(TEXTURIZER_WARNING_MESSAGE_MAP)) {
      expect(codes.has(key), `orphan message key: ${key}`).toBe(true)
    }
  })

  it('uses non-empty string values for nested detail key constants', () => {
    for (const s of collectNestedStrings(TEXTURIZER_WARNING_DETAIL_KEYS)) {
      expect(s.trim().length, s).toBeGreaterThan(0)
    }
  })
})
