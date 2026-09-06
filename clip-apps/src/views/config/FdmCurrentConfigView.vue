<template>
  <el-card class="cfg-card" v-loading="loading">
    <template #header>
      <div class="card-header">
        <span>FDM 当前配置</span>
      </div>
    </template>

    <el-form label-width="120px" label-position="left">
      <el-form-item label="当前设备">
        <el-select v-model="selectedDevice" style="width: 360px" filterable @change="onChange">
          <el-option v-for="d in cfg.devices" :key="d" :label="d" :value="d" />
        </el-select>
      </el-form-item>

      <el-form-item label="当前工艺">
        <el-select v-model="selectedProcess" style="width: 360px" filterable @change="onChange">
          <el-option v-for="p in cfg.processes" :key="p" :label="p" :value="p" />
        </el-select>
      </el-form-item>

      <el-form-item label="当前材料">
        <el-select v-model="selectedMaterial" style="width: 360px" filterable @change="onChange">
          <el-option v-for="m in cfg.materials" :key="m" :label="m" :value="m" />
        </el-select>
      </el-form-item>

      <el-divider />

      <el-descriptions title="ws-settings 映射" :column="1" border>
        <el-descriptions-item label="filter.FDM">
          {{ selectedDevice }}
        </el-descriptions-item>
        <el-descriptions-item label="cproc.FDM">
          {{ selectedProcess }}
        </el-descriptions-item>
        <el-descriptions-item label="currentMaterial.FDM">
          {{ selectedMaterial }}
        </el-descriptions-item>
      </el-descriptions>
    </el-form>

    <div style="margin-top: 12px; color: #909399">
      提示：这里仅维护“当前选中项”，不会修改具体设备/工艺/材料的参数内容。
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { clonePlain } from '@/core/clonePlain'
import type { CurrentFdmConfig } from '@/api/config'
import { getCurrentFdmConfig, setCurrentFdmConfig } from '@/api/config'

const loading = ref(false)
const cfg = reactive<CurrentFdmConfig>({
  mode: 'FDM',
  device: 'Any.Generic.Marlin',
  process: 'default',
  material: 'PLA',
  devices: [],
  processes: [],
  materials: [],
})

const selectedDevice = ref(cfg.device)
const selectedProcess = ref(cfg.process)
const selectedMaterial = ref(cfg.material)

async function load() {
  loading.value = true
  try {
    const c = clonePlain(await getCurrentFdmConfig())
    Object.assign(cfg, c)
    selectedDevice.value = c.device
    selectedProcess.value = c.process
    selectedMaterial.value = c.material
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function onChange() {
  await setCurrentFdmConfig({
    device: selectedDevice.value,
    process: selectedProcess.value,
    material: selectedMaterial.value,
  })
  ElMessage.success('当前配置已更新（写入 ws-settings）')
}
</script>

<style scoped>
.cfg-card {
  max-width: 800px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
