<template>
  <span v-if="showLegend" class="gcode-path-legend hint">
    <span class="gcode-path-legend__item">
      <i class="gcode-path-legend__swatch" :style="{ background: rapidCss }" />
      G0
    </span>
    <span class="gcode-path-legend__item">
      <i class="gcode-path-legend__swatch" :style="{ background: cutCss }" />
      G1/G2/G3
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  WORKSPACE_GCODE_VIEWPORT_PRESETS,
  workspaceGcodeColorToCss,
  type WorkspaceGcodePreviewKind,
} from '@/composables/useWorkspaceGcodePreview'

const props = defineProps<{
  kind: WorkspaceGcodePreviewKind
}>()

const preset = computed(() => WORKSPACE_GCODE_VIEWPORT_PRESETS[props.kind])
const showLegend = computed(() => preset.value.rapidPathColor != null)
const rapidCss = computed(() => workspaceGcodeColorToCss(preset.value.rapidPathColor!))
const cutCss = computed(() => workspaceGcodeColorToCss(preset.value.pathColor))
</script>

<style scoped>
.gcode-path-legend {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  font-size: 11px;
}
.gcode-path-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.gcode-path-legend__swatch {
  display: inline-block;
  width: 14px;
  height: 3px;
  border-radius: 1px;
}
</style>
