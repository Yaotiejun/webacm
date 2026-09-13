<template>
  <div class="gcode-preview-panel" :class="`gcode-preview-panel--${layout}`">
    <div v-if="title" class="pane-title">{{ title }}</div>
    <div v-if="emptyHint" class="pane-body hint">{{ emptyHint }}</div>
    <div
      v-if="showToolbar && ($slots.toolbar || toolbarHint || (jobPathHint && !showPathHintInOverlay))"
      class="gcode-preview-panel__toolbar pane-body"
    >
      <slot name="toolbar" />
      <span v-if="toolbarHint" class="hint">{{ toolbarHint }}</span>
      <GcodePathLegend v-if="showPathLegend" :kind="kind" />
      <span v-if="jobPathHint && !showPathHintInOverlay" class="gcode-preview-panel__path-hint">{{
        jobPathHint
      }}</span>
    </div>
    <div ref="viewportRootRef" class="pane-body viewport gcode-preview-panel__host">
      <canvas ref="viewportCanvasRef" class="gcode-preview-panel__canvas" />
      <div v-if="footnote" class="gcode-preview-panel__overlay">
        {{ footnote }}
        <GcodePathLegend v-if="showPathLegend" :kind="kind" />
        <span v-if="jobPathHint && showPathHintInOverlay" class="gcode-preview-panel__path-hint">
          {{ jobPathHint }}
        </span>
      </div>
    </div>
    <slot name="afterViewport" />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import {
  useWorkspaceGcodePreview,
  type UseWorkspaceGcodePreviewOptions,
  type WorkspaceGcodePreviewKind,
} from '@/composables/useWorkspaceGcodePreview'
import type { GcodeThreeToolPosition } from '@/composables/useGcodeThreeViewport'
import GcodePathLegend from '@/components/gcode/GcodePathLegend.vue'

export type GcodePreviewPanelLayout = 'default' | 'compact' | 'cam'

const props = withDefaults(
  defineProps<{
    kind: WorkspaceGcodePreviewKind
    jobGcode?: string
    /** Optional — defaults to origin; machine workspaces pass live WCS. */
    toolPosition?: GcodeThreeToolPosition
    /** Optional — defaults to muted gray stem. */
    stemColor?: number
    presetOverrides?: UseWorkspaceGcodePreviewOptions['presetOverrides']
    /** 0..1 path reveal for animate scrubbing. */
    pathProgress?: number
    title?: string
    footnote?: string
    toolbarHint?: string
    emptyHint?: string
    layout?: GcodePreviewPanelLayout
    /** When footnote is set, duplicate path hint under overlay (Carvera/GridBot). */
    showPathHintInOverlay?: boolean
    /** Kiri Laser/canvas modes: no toolbar strip above the viewport. */
    showToolbar?: boolean
    /** G0/G1 color legend (hidden for Kiri-like Laser chrome). */
    showPathLegend?: boolean
  }>(),
  {
    layout: 'default',
    showPathHintInOverlay: false,
    showToolbar: true,
    showPathLegend: true,
    jobGcode: '',
    toolPosition: () => ({ x: 0, y: 0, z: 0 }),
    stemColor: 0x909399,
    pathProgress: 1,
  },
)

const {
  jobPathHint,
  viewportRootRef,
  viewportCanvasRef,
  getOrCreateAnimateStockGroup,
  clearAnimateStockGroup,
  fitCameraToAnimateStock,
} = useWorkspaceGcodePreview(props.kind, {
    jobGcode: toRef(props, 'jobGcode'),
    toolPosition: toRef(props, 'toolPosition'),
    stemColor: toRef(props, 'stemColor'),
    pathProgress: toRef(props, 'pathProgress'),
    presetOverrides: props.presetOverrides,
  })

defineExpose({
  getOrCreateAnimateStockGroup,
  clearAnimateStockGroup,
  fitCameraToAnimateStock,
})
</script>

<style scoped>
.gcode-preview-panel--default .gcode-preview-panel__host {
  position: relative;
  height: calc(100% - 36px);
  min-height: 520px;
  padding: 0;
  background: #fff;
  border: 1px dashed #dcdfe6;
}
.gcode-preview-panel--compact .gcode-preview-panel__host {
  position: relative;
  min-height: 280px;
  height: 280px;
  margin-bottom: 8px;
  padding: 0;
  background: #fff;
  border: 1px dashed #dcdfe6;
}
.gcode-preview-panel--cam {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.gcode-preview-panel--cam .gcode-preview-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.gcode-preview-panel--cam .gcode-preview-panel__host {
  position: relative;
  flex: 1;
  min-height: 480px;
  padding: 0;
  background: #fff;
  border: 1px dashed #dcdfe6;
}
.gcode-preview-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 4px;
  padding-bottom: 8px;
}
.gcode-preview-panel__canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.gcode-preview-panel__overlay {
  position: absolute;
  left: 8px;
  bottom: 8px;
  right: 8px;
  font-size: 11px;
  color: #909399;
  pointer-events: none;
  line-height: 1.35;
}
.gcode-preview-panel__path-hint {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: #67c23a;
}
.gcode-preview-panel--cam .gcode-preview-panel__path-hint,
.gcode-preview-panel--compact .gcode-preview-panel__path-hint {
  display: inline;
  margin-top: 0;
  margin-left: 8px;
}
</style>
