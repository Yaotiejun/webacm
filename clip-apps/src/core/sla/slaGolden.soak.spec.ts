import { describe, expect, it } from 'vitest'
import {
  SLA_CUBE_CTB_SHA256,
  SLA_CUBE_GOO_SHA256,
  SLA_CUBE_GOLDEN_OPTS,
  SLA_CUBE_PHOTON_SHA256,
  slaBlobStructuralDigest,
  slaGoldenCube10mm,
} from '@/core/sla/slaGoldenProfile'
import { runSlaFromMesh } from '@/core/sla/slaEngine'
import { GOO_FILE_MAGIC, gooFileMagicOk } from '@/core/sla/slaExportGoo'

describe('slaGolden.soak', () => {
  it('SLA-CUBE photon SHA matches pin', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'photon',
    })
    expect(new DataView(result.blob).getUint32(0, true)).toBe(0x1900fd12)
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_PHOTON_SHA256)
  })

  it('SLA-CUBE ctb SHA matches pin', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb',
    })
    expect(new DataView(result.blob).getUint32(0, true)).toBe(0x12fd0086)
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_CTB_SHA256)
  })

  it('SLA-CUBE goo SHA matches pin', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'goo',
    })
    const u8 = new Uint8Array(result.blob)
    expect(gooFileMagicOk(result.blob)).toBe(true)
    expect([...u8.slice(4, 12)]).toEqual([...GOO_FILE_MAGIC])
    expect(result.blob.byteLength).toBeGreaterThan(32)
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_GOO_SHA256)
  })
})
