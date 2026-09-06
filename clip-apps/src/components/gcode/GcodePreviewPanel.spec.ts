import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import GcodePreviewPanel from './GcodePreviewPanel.vue'

vi.mock('@/composables/useWorkspaceGcodePreview', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/useWorkspaceGcodePreview')>()
  return {
    ...actual,
    useWorkspaceGcodePreview: () => ({
      jobPathHint: ref('G0/G1 · 4 点'),
      viewportRootRef: ref(null),
      viewportCanvasRef: ref(null),
    }),
  }
})

describe('GcodePreviewPanel', () => {
  it('renders title, toolbar hint, and path hint from composable', () => {
    const wrapper = mount(GcodePreviewPanel, {
      props: {
        kind: 'fdm',
        layout: 'compact',
        title: '3D preview',
        toolbarHint: 'slice ready',
        jobGcode: 'G1 X1',
        toolPosition: { x: 0, y: 0, z: 0 },
        stemColor: 0xffffff,
      },
    })
    expect(wrapper.text()).toContain('3D preview')
    expect(wrapper.text()).toContain('slice ready')
    expect(wrapper.text()).toContain('G0/G1 · 4 点')
    expect(wrapper.text()).toContain('G1/G2/G3')
    expect(wrapper.find('canvas.gcode-preview-panel__canvas').exists()).toBe(true)
  })
})
