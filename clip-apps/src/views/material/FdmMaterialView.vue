<template>
  <el-card class="mat-card">
    <template #header>
      <div class="card-header">
        <span>FDM 材料 / 耗材</span>
        <el-button type="primary" @click="onCloneFromCurrent">从当前材料复制</el-button>
      </div>
    </template>

    <el-row :gutter="16">
      <el-col :span="10">
        <h4>我的材料</h4>
        <el-table
          :data="localMaterials"
          style="width: 100%"
          @row-click="(row: MaterialSummary) => select(row.name, true)"
          :row-class-name="({ row }: { row: MaterialSummary }) => (row.name === selectedName ? 'is-selected' : '')"
        >
          <el-table-column prop="name" label="名称">
            <template #default="scope">
              <span>{{ scope.row.name }}</span>
              <el-tag v-if="scope.row.name === currentMaterial" size="small" type="success" style="margin-left: 4px">
                当前
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220">
            <template #default="scope">
              <el-button type="primary" size="small" @click.stop="select(scope.row.name, true)">编辑</el-button>
              <el-button type="success" size="small" @click.stop="onSetCurrent(scope.row.name)">设为当前</el-button>
              <el-button type="danger" size="small" @click.stop="onDelete(scope.row.name)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <h4 style="margin-top: 24px">内置材料</h4>
        <el-table
          :data="stockMaterials"
          style="width: 100%"
          @row-click="(row: MaterialSummary) => select(row.name, false)"
          :row-class-name="({ row }: { row: MaterialSummary }) => (row.name === selectedName && !isLocalSelected ? 'is-selected' : '')"
        >
          <el-table-column prop="name" label="名称" />
        </el-table>
      </el-col>

      <el-col :span="14">
        <h4>材料参数</h4>
        <el-alert
          v-if="!hasSelection"
          title="请选择左侧材料进行编辑，或先从当前材料复制一个。"
          type="info"
          show-icon
        />

        <el-form v-else :model="form" label-width="140px" label-position="left">
          <el-form-item label="材料名称">
            <el-input v-model="form.name" disabled />
          </el-form-item>

          <el-divider content-position="left">温度</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="喷嘴温度">
                <el-input-number v-model="form.nozzleTemp" :min="0" :max="400" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="热床温度">
                <el-input-number v-model="form.bedTemp" :min="0" :max="150" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">风扇</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="风扇速度">
                <el-input-number v-model="form.fanSpeed" :min="0" :max="255" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开启层">
                <el-input-number v-model="form.fanLayer" :min="0" :max="200" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">流量 / 回抽</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="流量倍率">
                <el-input-number v-model="form.flowMult" :min="0.5" :max="2" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="回抽距离">
                <el-input-number v-model="form.retractDist" :min="0" :max="20" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="回抽速度">
                <el-input-number v-model="form.retractSpeed" :min="0" :max="200" :step="1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button type="primary" @click="onSave" :disabled="!isLocalSelected">保存材料</el-button>
            <span v-if="!isLocalSelected" style="margin-left: 8px; color: #909399">
              只能编辑“我的材料”，内置材料需先复制为本地材料。
            </span>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FdmMaterial, MaterialSummary } from '@/types/material'
import { clonePlain } from '@/core/clonePlain'
import {
  listFdmMaterials,
  getFdmMaterial,
  saveFdmMaterial,
  deleteFdmMaterial,
  cloneFdmMaterialFromCurrent,
} from '@/api/material'
import { readCurrentKeys, setCurrentMaterial } from '@/api/current'
import { ElMessage, ElMessageBox } from 'element-plus'

const localMaterials = ref<MaterialSummary[]>([])
const stockMaterials = ref<MaterialSummary[]>([])

const selectedName = ref<string | null>(null)
const isLocalSelected = ref(false)
const hasSelection = ref(false)
const currentMaterial = ref<string>('PLA')

const form = reactive<FdmMaterial>({
  name: 'PLA',
  nozzleTemp: 200,
  bedTemp: 60,
  fanSpeed: 255,
  fanLayer: 1,
  flowMult: 1.0,
  retractDist: 1.5,
  retractSpeed: 40,
})

async function load() {
  const { local, stock } = await listFdmMaterials()
  localMaterials.value = local
  stockMaterials.value = stock

  const cur = await readCurrentKeys()
  currentMaterial.value = cur.material

  if (!selectedName.value && local.length > 0) {
    const first = local[0]
    if (!first) return
    const fallbackName = cur.material || first.name
    await select(fallbackName, true)
  }
}

onMounted(async () => {
  await load()
})

async function select(name: string, local: boolean) {
  selectedName.value = name
  isLocalSelected.value = local
  hasSelection.value = true

  if (!local) {
    form.name = name
    return
  }

  const rec = await getFdmMaterial(name)
  if (!rec) return
  Object.assign(form, clonePlain(rec))
}

async function onSave() {
  if (!selectedName.value || !isLocalSelected.value) {
    ElMessage.warning('请选择一个本地材料再保存')
    return
  }
  await saveFdmMaterial(selectedName.value, form)
  ElMessage.success('材料已保存')
  await load()
}

async function onDelete(name: string) {
  await ElMessageBox.confirm(`确认删除本地材料 "${name}"?`, '提示', {
    type: 'warning',
  })
  await deleteFdmMaterial(name)
  ElMessage.success('已删除')
  if (selectedName.value === name) {
    selectedName.value = null
    hasSelection.value = false
  }
  await load()
}

async function onCloneFromCurrent() {
  const { value: name } = await ElMessageBox.prompt('请输入新材料名称', '从当前材料复制', {
    inputPlaceholder: '例如：My PLA',
  })
  if (!name) return
  await cloneFdmMaterialFromCurrent(name)
  ElMessage.success('已从当前材料复制为本地材料')
  await load()
  await select(name, true)
}

async function onSetCurrent(name: string) {
  await setCurrentMaterial(name)
  currentMaterial.value = name
  ElMessage.success('已设为当前材料')
}
</script>

<style scoped>
.mat-card {
  max-width: 1200px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
:deep(.el-table .is-selected) {
  background-color: #ecf5ff;
}
</style>
