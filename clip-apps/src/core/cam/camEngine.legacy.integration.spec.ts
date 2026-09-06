/**
 * @vitest-environment jsdom
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getKiriCamImpls, kiriCamRuntime } from './kiriCamRuntime'
import { runCamJob } from './camEngine'
import type { CamJobInputGeometry, CamProfile } from '@/types/camJob'
import defaultDeviceJson from '@/core/cam/defaults/kiri-cam-device.json'
import defaultToolsJson from '@/core/cam/defaults/kiri-cam-tools.json'
import defaultProcessJson from '@/core/cam/defaults/kiri-cam-process.json'
import { canonicalizeCamProcessConfig } from './camJobSummaryBridge'
import { clonePlain } from '@/core/clonePlain'

const legacyAvailable = () => {
  const { camSliceImpl, camExportImpl } = getKiriCamImpls()
  return typeof camSliceImpl === 'function' && typeof camExportImpl === 'function'
}

function sampleProfile(): CamProfile {
  return {
    device: clonePlain(defaultDeviceJson) as CamProfile['device'],
    tools: clonePlain(defaultToolsJson) as CamProfile['tools'],
    process: canonicalizeCamProcessConfig(clonePlain(defaultProcessJson) as CamProfile['process']),
  }
}

function sampleGeometry(): CamJobInputGeometry {
  return {
    id: 'stock-box',
    bbox: { minX: -50, minY: -50, minZ: 0, maxX: 50, maxY: 50, maxZ: 10 },
    complexityHint: 1,
  }
}

describe('runCamJob legacy integration', () => {
  beforeAll(async () => {
    await kiriCamRuntime.init()
  })

  it.skipIf(!legacyAvailable())('produces kiri-cam G-code from default profile + bbox mesh', async () => {
    const result = await runCamJob(sampleProfile(), sampleGeometry())
    expect(result.backend).toBe('kiri-cam')
    expect(result.gcodeText?.length).toBeGreaterThan(20)
    expect(result.gcodeText).toMatch(/G0|G1/)
    expect(result.fallback).toBeNull()
  }, 120_000)

  it.skipIf(!legacyAvailable())('produces parseable path from box mesh vertices', async () => {
    const g = sampleGeometry()
    const dx = g.bbox.maxX - g.bbox.minX
    const dy = g.bbox.maxY - g.bbox.minY
    const dz = g.bbox.maxZ - g.bbox.minZ
    const geometry: CamJobInputGeometry = {
      ...g,
      id: 'box-mesh',
      vertices: new Float32Array([
        0, 0, 0, dx, 0, 0, 0, dy, 0,
        dx, dy, 0, 0, 0, dz, dx, 0, dz,
        0, dy, dz, dx, dy, dz,
      ]),
      complexityHint: 2,
    }
    const result = await runCamJob(sampleProfile(), geometry)
    expect(['kiri-cam', 'kiri-cam-slice-only']).toContain(result.backend)
    const text = result.gcodeText ?? ''
    expect(text.length).toBeGreaterThan(10)
    const { getCachedGcodePathBuild, resetGcodePathBuildCacheForTests } = await import(
      '@/core/gcode/gcodePathBuildCache'
    )
    resetGcodePathBuildCacheForTests()
    const built = getCachedGcodePathBuild(text)
    expect(built.vertexCount).toBeGreaterThan(1)
  }, 120_000)
})
