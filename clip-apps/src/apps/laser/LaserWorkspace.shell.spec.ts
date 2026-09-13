import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const vuePath = join(dirname(fileURLToPath(import.meta.url)), 'LaserWorkspace.vue')

describe('LaserWorkspace shell contract (offline)', () => {
  it('matches Kiri: File→import, Image Conversion dialog, heightmap arrange', () => {
    const src = readFileSync(vuePath, 'utf8')
    expect(src).not.toContain('导入 SVG/DXF/图片')
    expect(src).not.toContain('样件方框')
    expect(src).not.toContain('Import SVG/DXF/Image')
    expect(src).toContain('Image Conversion')
    expect(src).toContain('imgDialogVisible')
    expect(src).toContain('onImgDialogConvert')
    expect(src).toContain('buildLaserHeightmapArrangeMesh')
    expect(src).toContain('showArrangeMesh')
    expect(src).toContain('WORKSPACE_EVENT')
    expect(src).toContain('File → import')
    expect(src).toContain(':show-toolbar="false"')
    expect(src).toContain('layoutPack: pack')
    expect(src).toContain('nestGap: isImage || sliceSingle.value ? 0')
    expect(src).toContain('bedWidth: bedW')
    expect(src).toContain('maxWidthPx: 1000')
  })
})