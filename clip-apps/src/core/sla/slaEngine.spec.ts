import { describe, expect, it } from 'vitest'
import { runSlaFromMesh } from '@/core/sla/slaEngine'
import { addPillarSupports, sliceMeshToLayers } from '@/core/sla/slaLayers'
import { countBundledSlaDevices, getStockSlaDevice } from '@/core/sla/stock/stockSlaDevices'
import {
  SLA_CUBE_CTB_SHA256,
  SLA_CUBE_GOLDEN_OPTS,
  SLA_CUBE_PHOTON_SHA256,
  slaBlobStructuralDigest,
  slaCantileverFixture,
  slaGoldenCube10mm,
} from '@/core/sla/slaGoldenProfile'
import { GOO_FILE_MAGIC, gooFileMagicOk } from '@/core/sla/slaExportGoo'

describe('slaLayers', () => {
  it('slices 10mm cube at 1mm into >= 8 layers', async () => {
    const layers = await sliceMeshToLayers(slaGoldenCube10mm(), 1.0)
    expect(layers.length).toBeGreaterThanOrEqual(8)
    expect(layers.some((L) => L.fills.length > 0)).toBe(true)
  })

  it('adds pillar disks under cantilever overhang', async () => {
    const layers = await sliceMeshToLayers(slaCantileverFixture(), 1.0)
    const before = layers.reduce((n, L) => n + L.fills.length, 0)
    const withSup = addPillarSupports(layers, { enable: true, spacingMm: 4, radiusMm: 0.8 })
    const after = withSup.reduce((n, L) => n + L.fills.length, 0)
    expect(after).toBeGreaterThan(before)
    expect(withSup[0]!.fills.length).toBeGreaterThan(layers[0]!.fills.length)
  })
})

describe('slaEngine + stock', () => {
  it('bundles sla devices', () => {
    expect(countBundledSlaDevices()).toBeGreaterThanOrEqual(5)
    expect(getStockSlaDevice('Anycubic.Photon')?.bedWidth).toBeGreaterThan(0)
  })

  it('exports photon with magic 0x1900fd12', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'photon',
    })
    expect(result.layerCount).toBeGreaterThanOrEqual(8)
    expect(result.backend).toBe('sla-ts-mvp')
    expect(result.filenameExt).toBe('photon')
    expect(result.blob.byteLength).toBeGreaterThan(32)
    const magic = new DataView(result.blob).getUint32(0, true)
    expect(magic).toBe(0x1900fd12)
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_PHOTON_SHA256)
  })

  it('exports ctb v3-ish blob with ChiTu magic', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb',
    })
    expect(result.blob.byteLength).toBeGreaterThan(32)
    expect(result.filenameExt).toBe('ctb')
    expect(new DataView(result.blob).getUint32(0, true)).toBe(0x12fd0086)
    expect(slaBlobStructuralDigest(result.blob)).toBe(SLA_CUBE_CTB_SHA256)
  })

  it('exports goo V3.0 blob with FILE_MAGIC after version', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'goo',
    })
    expect(result.filenameExt).toBe('goo')
    expect(result.blob.byteLength).toBeGreaterThan(32)
    expect(gooFileMagicOk(result.blob)).toBe(true)
    const u8 = new Uint8Array(result.blob)
    expect([...u8.slice(4, 12)]).toEqual([...GOO_FILE_MAGIC])
  })

  it('exports ctb-encrypted with magic 0x12fd0107', async () => {
    const result = await runSlaFromMesh(slaGoldenCube10mm(), {
      ...SLA_CUBE_GOLDEN_OPTS,
      exportFormat: 'ctb-encrypted',
    })
    expect(result.filenameExt).toBe('ctb')
    expect(new DataView(result.blob).getUint32(0, true)).toBe(0x12fd0107)
  })
})
