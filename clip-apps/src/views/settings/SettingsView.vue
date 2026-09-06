<template>
  <el-card v-loading="loading" class="settings-card">
    <template #header>
      <div class="card-header">
        <span>全局设置 / 偏好</span>
        <div>
          <el-button type="primary" @click="onSave">保存</el-button>
        </div>
      </div>
    </template>

    <el-form
      v-if="controller"
      :model="form"
      label-width="140px"
      label-position="left"
    >
      <el-form-item label="深色模式">
        <el-switch v-model="form.dark" />
      </el-form-item>

      <el-form-item label="抗锯齿">
        <el-switch v-model="form.antiAlias" />
      </el-form-item>

      <el-form-item label="自动布局">
        <el-switch v-model="form.autoLayout" />
      </el-form-item>

      <el-form-item label="自动保存">
        <el-switch v-model="form.autoSave" />
      </el-form-item>

      <el-form-item label="单位">
        <el-select v-model="form.units" style="width: 160px">
          <el-option label="毫米 (mm)" value="mm" />
          <el-option label="英寸 (inch)" value="inch" />
        </el-select>
      </el-form-item>

      <el-form-item label="细节等级">
        <el-slider
          v-model="detailValue"
          :min="25"
          :max="100"
          :step="25"
          show-stops
          :marks="detailMarks"
          style="max-width: 320px"
        />
      </el-form-item>

      <el-form-item label="反向缩放">
        <el-switch v-model="form.reverseZoom" />
      </el-form-item>

      <el-form-item label="缩放速度">
        <el-slider v-model="form.zoomSpeed" :min="0.1" :max="3" :step="0.1" />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { clonePlain } from '@/core/clonePlain'
import { useSettingsStore } from '@/stores/useSettingsStore'
import type { ControllerSettings } from '@/types/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()

const loading = computed(() => settingsStore.loading)
const controller = computed(() => settingsStore.settings?.controller ?? null)

const form = reactive<ControllerSettings>({
  animesh: '',
  antiAlias: true,
  assembly: false,
  autoLayout: true,
  autoSave: true,
  dark: false,
  detail: '50',
  devel: false,
  drawer: false,
  edgeangle: 20,
  exportOcto: false,
  exportPreview: false,
  exportThumb: false,
  freeLayout: true,
  healMesh: false,
  lineType: 'path',
  manifold: false,
  ortho: false,
  reverseZoom: true,
  scrolls: true,
  shiny: true,
  showOrigin: false,
  showRulers: true,
  showSpeeds: true,
  spaceLayout: 1,
  spaceRandoX: false,
  threaded: true,
  units: 'mm',
  view: null,
  webGPU: false,
  zoomSpeed: 1.0,
})

const detailMarks: Record<number, string> = {
  25: '低',
  50: '中',
  75: '高',
  100: '最高',
}

const detailValue = computed({
  get() {
    const v = Number(form.detail)
    return Number.isNaN(v) ? 50 : v
  },
  set(val: number) {
    form.detail = String(val)
  },
})

watch(
  controller,
  (val) => {
    if (!val) return
    Object.assign(form, clonePlain(val))
  },
  { immediate: true },
)

onMounted(async () => {
  await settingsStore.load()
})

async function onSave() {
  await settingsStore.updateController(form)
  try {
    await settingsStore.save()
    ElMessage.success('设置已保存')
  } catch (e) {
    ElMessage.error('保存失败，请稍后再试')
  }
}
</script>

<style scoped>
.settings-card {
  max-width: 800px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
