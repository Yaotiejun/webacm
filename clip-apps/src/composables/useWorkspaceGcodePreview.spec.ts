import { describe, expect, it } from 'vitest'
import { WORKSPACE_GCODE_VIEWPORT_PRESETS, workspaceGcodeColorToCss } from './useWorkspaceGcodePreview'

const KINDS = ['carvera', 'gridbot', 'cam', 'fdm', 'raster'] as const

describe('useWorkspaceGcodePreview presets', () => {
  it('defines a distinct pathColor per workspace kind', () => {
    const colors = new Set<number>()
    for (const k of KINDS) {
      const c = WORKSPACE_GCODE_VIEWPORT_PRESETS[k].pathColor
      expect(c).toBeGreaterThan(0)
      colors.add(c)
    }
    expect(colors.size).toBe(KINDS.length)
  })

  it('workspaceGcodeColorToCss formats hex colors', () => {
    expect(workspaceGcodeColorToCss(0x409eff)).toBe('#409eff')
  })

  it('defines rapidPathColor distinct from pathColor for each kind', () => {
    for (const k of KINDS) {
      const preset = WORKSPACE_GCODE_VIEWPORT_PRESETS[k]
      expect(preset.rapidPathColor).toBeGreaterThan(0)
      expect(preset.rapidPathColor).not.toBe(preset.pathColor)
    }
  })
})
