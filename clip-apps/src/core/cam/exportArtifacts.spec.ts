import { describe, expect, it } from 'vitest'
import { createJsonExportArtifact, createTimestampedJsonFilename } from './exportArtifacts'

describe('cam.exportArtifacts', () => {
  it('creates deterministic timestamped json filename', () => {
    const out = createTimestampedJsonFilename('cam-test', new Date('2026-01-02T03:04:05.678Z'))
    expect(out).toBe('cam-test-2026-01-02T03-04-05-678Z.json')
  })

  it('creates json export artifact payload', () => {
    const out = createJsonExportArtifact('cam-test', { ok: true }, new Date('2026-01-02T03:04:05.678Z'))
    expect(out.filename).toBe('cam-test-2026-01-02T03-04-05-678Z.json')
    expect(JSON.parse(out.json)).toEqual({ ok: true })
  })
})
