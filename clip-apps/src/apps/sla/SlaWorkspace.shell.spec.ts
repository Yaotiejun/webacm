import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const vuePath = join(dirname(fileURLToPath(import.meta.url)), 'SlaWorkspace.vue')

describe('SlaWorkspace shell contract (offline)', () => {
  it('keeps Kiri-like 3D arrange/slice and export entrypoints', () => {
    const src = readFileSync(vuePath, 'utf8')
    expect(src).toContain('Import STL/OBJ')
    expect(src).toContain('submitSlaJob')
    expect(src).toContain('photon')
    expect(src).toContain('ctb')
    expect(src).toContain('goo')
    expect(src).toContain('supportEnable')
    expect(src).toContain('supportOptsFromUi')
    expect(src).toContain('Machine')
    expect(src).toContain('Profile')
    expect(src).toContain('切片')
    expect(src).toContain('层')
    expect(src).toContain('基础')
    expect(src).toContain('填充')
    expect(src).toContain('支撑')
    expect(src).toContain('输出')
    expect(src).toContain('/laser')
    expect(src).toContain('GcodePreviewPanel')
    expect(src).toContain('buildSlaArrangeMesh')
    expect(src).toContain('createSlaSliceStack')
    expect(src).toContain('onAnimateModeClick')
    expect(src).toContain('startAnimatePlayback')
    expect(src).toContain('<span>animate</span>')
    expect(src).toContain("mode: 'preview'")
    expect(src).toContain('submitSlaExport')
    expect(src).toContain('countDrawableSlaFills')
    expect(src).toContain('Kiri geo')
    expect(src).toContain('WORKSPACE_EVENT')
    expect(src).toContain('kind="sla"')
    expect(src).toContain('km-layer-bar')
    expect(src).not.toContain('sla-layer-canvas')
    expect(src).not.toContain('showLayerCanvas')
    // Kiri SLA hides separate preview button
    expect(src).not.toMatch(/<span>preview<\/span>/)
  })
})
