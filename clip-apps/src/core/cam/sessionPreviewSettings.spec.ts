import { describe, expect, it } from 'vitest'
import {
  createSessionPreviewSettingsExportArtifact,
  createSessionPreviewSettingsPayload,
  DEFAULT_SESSION_PREVIEW_LIMIT,
  loadSessionPreviewLimitFromStorage,
  normalizeSessionPreviewLimit,
  resolveSessionPreviewSettingsPayload,
  saveSessionPreviewLimitToStorage,
  SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION,
} from './sessionPreviewSettings'

describe('cam.sessionPreviewSettings.resolveSessionPreviewSettingsPayload', () => {
  it('accepts schemaVersion=1 payload', () => {
    const out = resolveSessionPreviewSettingsPayload({ schemaVersion: 1, previewLimit: 12 })
    expect(out.previewLimit).toBe(12)
    expect(out.warning).toBeUndefined()
  })

  it('accepts payload with missing schemaVersion as v1-compatible', () => {
    const out = resolveSessionPreviewSettingsPayload({ previewLimit: 20 } as Record<string, unknown>)
    expect(out.previewLimit).toBe(20)
    expect(out.warning).toBeUndefined()
  })

  it('returns compatibility warning for unknown numeric schema version', () => {
    const out = resolveSessionPreviewSettingsPayload({ schemaVersion: 2, previewLimit: 8 })
    expect(out.previewLimit).toBe(8)
    expect(out.warning).toContain('schemaVersion=2')
  })

  it('rejects invalid previewLimit', () => {
    expect(() => resolveSessionPreviewSettingsPayload({ schemaVersion: 1, previewLimit: 10 })).toThrow(
      'invalid previewLimit',
    )
  })

  it('normalizes unknown limit to default', () => {
    expect(normalizeSessionPreviewLimit(10)).toBe(DEFAULT_SESSION_PREVIEW_LIMIT)
  })

  it('loads preview limit from storage with fallback', () => {
    const storage = {
      getItem: () => '12',
      setItem: () => {},
    }
    expect(loadSessionPreviewLimitFromStorage(storage)).toBe(12)
    expect(
      loadSessionPreviewLimitFromStorage({
        getItem: () => '10',
        setItem: () => {},
      }),
    ).toBe(DEFAULT_SESSION_PREVIEW_LIMIT)
  })

  it('saves normalized preview limit to storage', () => {
    let saved: string | null = null
    const storage = {
      getItem: () => null,
      setItem: (_k: string, v: string) => {
        saved = v
      },
    }
    expect(saveSessionPreviewLimitToStorage(storage, 20)).toBe(20)
    expect(saved).toBe('20')
    expect(saveSessionPreviewLimitToStorage(storage, 10)).toBe(DEFAULT_SESSION_PREVIEW_LIMIT)
  })

  it('creates export payload with schema and normalized limit', () => {
    const out = createSessionPreviewSettingsPayload(10)
    expect(out.schemaVersion).toBe(SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION)
    expect(out.previewLimit).toBe(DEFAULT_SESSION_PREVIEW_LIMIT)
  })

  it('creates export artifact with deterministic filename and json', () => {
    const out = createSessionPreviewSettingsExportArtifact(12, new Date('2026-01-02T03:04:05.678Z'))
    expect(out.filename).toBe('cam-session-preview-settings-2026-01-02T03-04-05-678Z.json')
    const parsed = JSON.parse(out.json) as { schemaVersion: number; previewLimit: number }
    expect(parsed.schemaVersion).toBe(SESSION_PREVIEW_SETTINGS_SCHEMA_VERSION)
    expect(parsed.previewLimit).toBe(12)
  })
})
