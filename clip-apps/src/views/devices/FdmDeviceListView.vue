<template>
  <el-card class="devices-card">
    <template #header>
      <div class="card-header">
        <span>FDM 设备 / 机型</span>
        <el-button type="primary" @click="onAddFromCurrent">从当前配置复制</el-button>
      </div>
    </template>

    <el-row :gutter="16">
      <el-col :span="12">
        <h4>我的设备</h4>
        <el-table :data="localDevices" style="width: 100%">
          <el-table-column prop="name" label="名称">
            <template #default="scope">
              <span>{{ scope.row.name }}</span>
              <el-tag v-if="scope.row.name === currentDevice" size="small" type="success" style="margin-left: 4px">
                当前
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template #default="scope">
              <el-button type="primary" size="small" @click="onSetCurrent(scope.row.name)">
                设为当前
              </el-button>
              <el-button type="danger" size="small" @click="onDelete(scope.row.name)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-col>

      <el-col :span="12">
        <h4>内置设备</h4>
        <el-table :data="stockDevices" style="width: 100%">
          <el-table-column prop="name" label="名称" />
        </el-table>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { DeviceSummary } from '@/types/device'
import { clonePlain } from '@/core/clonePlain'
import { listFdmDevices, deleteLocalFdmDevice, addLocalFdmDeviceFromCurrent } from '@/api/devices'
import { readCurrentKeys, setCurrentDevice } from '@/api/current'
import { ElMessageBox, ElMessage } from 'element-plus'

const localDevices = ref<DeviceSummary[]>([])
const stockDevices = ref<DeviceSummary[]>([])
const currentDevice = ref<string>('Any.Generic.Marlin')

async function load() {
  const { local, stock } = await listFdmDevices()
  localDevices.value = clonePlain(local)
  stockDevices.value = clonePlain(stock)
  const cur = await readCurrentKeys()
  currentDevice.value = cur.device
}

onMounted(async () => {
  await load()
})

async function onDelete(name: string) {
  await ElMessageBox.confirm(`确认删除本地设备 "${name}"?`, '提示', {
    type: 'warning',
  })
  await deleteLocalFdmDevice(name)
  ElMessage.success('已删除')
  await load()
}

async function onAddFromCurrent() {
  const { value: name } = await ElMessageBox.prompt('请输入新设备名称', '从当前配置复制', {
    inputPlaceholder: '例如：My Printer',
  })
  if (!name) return
  await addLocalFdmDeviceFromCurrent(name)
  ElMessage.success('已从当前配置复制为本地设备')
  await load()
}

async function onSetCurrent(name: string) {
  await setCurrentDevice(name)
  currentDevice.value = name
  ElMessage.success('已设为当前设备')
}
</script>

<style scoped>
.devices-card {
  max-width: 1000px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
