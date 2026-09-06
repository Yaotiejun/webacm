import { describe, expect, it } from 'vitest'
import { normalizeWarning } from './warningUi'
import { TEXTURIZER_WARNING_CODES } from '@/types/texturizerWarnings'

describe('warningUi.normalizeWarning', () => {
  it('normalizes legacy string warnings to legacy_* code', () => {
    const out = normalizeWarning('Safety cap hit (OOM)')
    expect(out.code).toMatch(/^legacy_/)
    expect(out.level).toBe('error')
    expect(out.message).toBe('Safety cap hit (OOM)')
  })

  it('keeps known warning code unchanged', () => {
    const known = {
      code: TEXTURIZER_WARNING_CODES.SUBDIV_SAFETY_CAP_HIT,
      level: 'error' as const,
      details: { postSubdivTriCount: 1200 },
    }
    const out = normalizeWarning(known)
    expect(out).toEqual(known)
  })

  it('normalizes unknown non-prefixed code to unknown_*', () => {
    const out = normalizeWarning({
      code: 'custom_runtime_warning',
      level: 'warning',
      message: 'runtime warning',
      details: { hint: 'x' },
    } as any)
    expect(out.code).toMatch(/^unknown_/)
    expect(out.level).toBe('warning')
    expect(out.message).toBe('runtime warning')
  })
})
