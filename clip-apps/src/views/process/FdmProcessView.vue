<template>
  <el-card class="proc-card">
    <template #header>
      <div class="card-header">
        <span>FDM 工艺 / Profiles</span>
        <el-button type="primary" @click="onCloneFromCurrent">从当前工艺复制</el-button>
      </div>
    </template>

    <el-row :gutter="16">
      <el-col :span="10">
        <h4>我的工艺</h4>
        <el-table
          :data="localProfiles"
          style="width: 100%"
          @row-click="(row: ProcessSummary) => select(row.name, true)"
          :row-class-name="({ row }: { row: ProcessSummary }) => (row.name === selectedName ? 'is-selected' : '')"
        >
          <el-table-column prop="name" label="名称">
            <template #default="scope">
              <span>{{ scope.row.name }}</span>
              <el-tag v-if="scope.row.name === currentProcess" size="small" type="success" style="margin-left: 4px">
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

        <h4 style="margin-top: 24px">内置工艺</h4>
        <el-table
          :data="stockProfiles"
          style="width: 100%"
          @row-click="(row: ProcessSummary) => select(row.name, false)"
          :row-class-name="({ row }: { row: ProcessSummary }) => (row.name === selectedName && !isLocalSelected ? 'is-selected' : '')"
        >
          <el-table-column prop="name" label="名称" />
        </el-table>
      </el-col>

      <el-col :span="14">
        <h4>工艺参数</h4>
        <el-alert
          v-if="!hasSelection"
          title="请选择左侧工艺进行编辑，或先从当前工艺复制一个。"
          type="info"
          show-icon
        />

        <el-form v-else :model="form" label-width="140px" label-position="left">
          <el-form-item label="工艺名称">
            <el-input v-model="form.processName" disabled />
          </el-form-item>

          <el-divider content-position="left">层高</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="层高 (mm)">
                <el-input-number v-model="form.sliceHeight" :min="0.01" :max="2" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="首层层高 (mm)">
                <el-input-number v-model="form.firstSliceHeight" :min="0.01" :max="2" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="外壳数">
                <el-input-number v-model="form.sliceShells" :min="0" :max="20" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="顶层数">
                <el-input-number v-model="form.sliceTopLayers" :min="0" :max="50" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="底层数">
                <el-input-number v-model="form.sliceBottomLayers" :min="0" :max="50" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="线宽 (mm)">
                <el-input-number v-model="form.sliceLineWidth" :min="0.1" :max="2" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="自适应层高">
                <el-switch v-model="form.sliceAdaptive" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="最小层高 (mm)">
                <el-input-number v-model="form.sliceMinHeight" :min="0.01" :max="form.sliceHeight" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">温度</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="喷嘴温度">
                <el-input-number v-model="form.outputTemp" :min="0" :max="400" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="热床温度">
                <el-input-number v-model="form.outputBedTemp" :min="0" :max="150" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="首层喷嘴温度">
                <el-input-number v-model="form.firstLayerNozzleTemp" :min="0" :max="400" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="首层热床温度">
                <el-input-number v-model="form.firstLayerBedTemp" :min="0" :max="150" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">速度</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="打印速度">
                <el-input-number v-model="form.outputFeedrate" :min="1" :max="300" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="空程速度">
                <el-input-number v-model="form.outputSeekrate" :min="1" :max="500" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="首层速度">
                <el-input-number v-model="form.firstLayerRate" :min="1" :max="200" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">填充</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="填充密度">
                <el-input-number v-model="form.sliceFillSparse" :min="0" :max="1" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="填充类型">
                <el-select v-model="form.sliceFillType" style="width: 100%">
                  <el-option label="无" value="none" />
                  <el-option label="grid" value="grid" />
                  <el-option label="linear" value="linear" />
                  <el-option label="hex" value="hex" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="填充重叠">
                <el-input-number v-model="form.sliceFillOverlap" :min="0" :max="1" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">回抽 / 风扇</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="回抽距离">
                <el-input-number v-model="form.outputRetractDist" :min="0" :max="20" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="回抽速度">
                <el-input-number v-model="form.outputRetractSpeed" :min="0" :max="200" :step="1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="风扇速度">
                <el-input-number v-model="form.outputFanSpeed" :min="0" :max="255" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="开启层">
                <el-input-number v-model="form.outputFanLayer" :min="0" :max="200" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">支撑</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="启用支撑">
                <el-switch v-model="form.sliceSupportEnable" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="支撑密度">
                <el-input-number v-model="form.sliceSupportDensity" :min="0" :max="1" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="水平间隙 (mm)">
                <el-input-number v-model="form.sliceSupportOffset" :min="0" :max="2" :step="0.05" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="支撑柱尺寸 (mm)">
                <el-input-number v-model="form.sliceSupportSize" :min="1" :max="20" :step="0.5" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="悬垂角度 (°)">
                <el-input-number v-model="form.sliceSupportAngle" :min="0" :max="90" :step="1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="Z 间隙 (×层高)">
                <el-input-number v-model="form.sliceSupportZGap" :min="0" :max="3" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="XY 扩展 (mm)">
                <el-input-number v-model="form.sliceSupportXYExpand" :min="0" :max="5" :step="0.1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="接口层数">
                <el-input-number v-model="form.sliceSupportInterfaceLayers" :min="0" :max="10" :step="1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="仅轮廓支撑">
                <el-switch v-model="form.sliceSupportOutlineOnly" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">薄壁 / 补偿 / 挤出倍率</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="薄壁处理">
                <el-select v-model="form.sliceDetectThin" style="width: 100%">
                  <el-option :value="0" label="关闭" />
                  <el-option :value="1" label="自动" />
                  <el-option :value="2" label="仅外壳" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="内轮廓补偿 (mm)">
                <el-input-number v-model="form.sliceCompInner" :min="-0.5" :max="0.5" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="外轮廓补偿 (mm)">
                <el-input-number v-model="form.sliceCompOuter" :min="-0.5" :max="0.5" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="壳挤出倍率">
                <el-input-number v-model="form.outputShellMult" :min="0.5" :max="1.5" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="填充挤出倍率">
                <el-input-number v-model="form.outputFillMult" :min="0.5" :max="1.5" :step="0.01" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="稀疏挤出倍率">
                <el-input-number v-model="form.outputSparseMult" :min="0.5" :max="1.5" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">Brim / Raft</el-divider>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="启用 Brim">
                <el-switch v-model="form.enableBrim" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Brim 圈数">
                <el-input-number v-model="form.brimCount" :min="0" :max="20" :step="1" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Brim 偏移 (mm)">
                <el-input-number v-model="form.brimOffset" :min="0" :max="10" :step="0.1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="启用 Raft">
                <el-switch v-model="form.enableRaft" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="Raft 间距 (mm)">
                <el-input-number v-model="form.raftSpacing" :min="0" :max="5" :step="0.1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">其它</el-divider>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="最小层时间">
                <el-input-number v-model="form.outputMinLayerTime" :min="0" :max="999" :step="1" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Z 抬升">
                <el-input-number v-model="form.zHopDistance" :min="0" :max="5" :step="0.01" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">按层范围覆盖 (ranges)</el-divider>
          <div class="ranges-table">
            <div class="ranges-header">
              <span>起始层</span>
              <span>结束层</span>
              <span>层高</span>
              <span>喷嘴温度</span>
              <span>打印速度</span>
              <span>风扇速度</span>
              <span>回抽距离</span>
            </div>
            <div
              v-for="(r, idx) in form.ranges"
              :key="idx"
              class="ranges-row"
            >
              <el-input-number v-model="r.fromLayer" :min="0" :max="9999" :step="1" />
              <el-input-number v-model="r.toLayer" :min="0" :max="9999" :step="1" />
              <el-input-number v-model="r.sliceHeight" :min="0.01" :max="2" :step="0.01" />
              <el-input-number v-model="r.outputTemp" :min="0" :max="400" />
              <el-input-number v-model="r.outputFeedrate" :min="1" :max="300" />
              <el-input-number v-model="r.outputFanSpeed" :min="0" :max="255" />
              <el-input-number v-model="r.outputRetractDist" :min="0" :max="20" :step="0.1" />
              <el-button
                type="text"
                size="small"
                @click="removeRange(idx)"
              >
                删除
              </el-button>
            </div>
            <div v-if="!form.ranges || form.ranges.length === 0" class="hint" style="margin-top: 4px">
              当前未配置任何范围覆盖。
            </div>
            <el-button
              style="margin-top: 4px"
              size="small"
              :disabled="form.ranges && form.ranges.length >= 3"
              @click="addRange"
            >
              添加范围
            </el-button>
            <span class="hint" style="margin-left: 8px">
              最多 3 条，从低到高层按顺序应用；未覆盖的层使用全局参数。
            </span>
          </div>

          <el-form-item>
            <el-button type="primary" @click="onSave" :disabled="!isLocalSelected">保存工艺</el-button>
            <span v-if="!isLocalSelected" style="margin-left: 8px; color: #909399">
              只能编辑“我的工艺”，内置工艺需先复制为本地工艺。
            </span>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import type { ProcessSummary, FdmProcess, FdmProcessRange } from '@/types/process'
import { clonePlain } from '@/core/clonePlain'
import {
  listFdmProcesses,
  getFdmProcess,
  saveFdmProcess,
  deleteFdmProcess,
  cloneFdmProcessFromCurrent,
} from '@/api/process'
import { readCurrentKeys, setCurrentProcess } from '@/api/current'
import { ElMessageBox, ElMessage } from 'element-plus'

const localProfiles = ref<ProcessSummary[]>([])
const stockProfiles = ref<ProcessSummary[]>([])

const selectedName = ref<string | null>(null)
const isLocalSelected = ref(false)
const hasSelection = ref(false)
const currentProcess = ref<string>('default')

const form = reactive<FdmProcess>({
  processName: 'default',
  outputTemp: 200,
  outputBedTemp: 60,
  firstLayerNozzleTemp: 0,
  firstLayerBedTemp: 0,
  outputFeedrate: 50,
  outputSeekrate: 80,
  firstLayerRate: 30,
  sliceHeight: 0.25,
  firstSliceHeight: 0.25,
  sliceTopLayers: 3,
  sliceBottomLayers: 3,
  sliceShells: 3,
  sliceLineWidth: 0.4,
  sliceAdaptive: false,
  sliceMinHeight: 0.1,
  sliceFillSparse: 0.25,
  sliceFillType: 'grid',
  sliceFillOverlap: 0.15,
  sliceSupportEnable: false,
  sliceSupportDensity: 0.2,
  sliceSupportOffset: 0.4,
  sliceSupportSize: 4,
  sliceSupportAngle: 45,
  sliceSupportZGap: 1,
  sliceSupportXYExpand: 0,
  sliceSupportInterfaceLayers: 0,
  sliceSupportOutlineOnly: false,
  sliceDetectThin: 1,
  sliceCompInner: 0,
  sliceCompOuter: 0,
  outputShellMult: 1,
  outputFillMult: 1,
  outputSparseMult: 1,
  enableBrim: false,
  brimCount: 0,
  brimOffset: 0,
  enableRaft: false,
  raftSpacing: 0.2,
  outputRetractDist: 1.5,
  outputRetractSpeed: 40,
  outputFanSpeed: 255,
  outputFanLayer: 1,
  outputMinLayerTime: 10,
  zHopDistance: 0.2,
  ranges: [],
})

async function load() {
  const { local, stock } = await listFdmProcesses()
  localProfiles.value = clonePlain(local)
  stockProfiles.value = clonePlain(stock)

  const cur = await readCurrentKeys()
  currentProcess.value = cur.process

  if (!selectedName.value && local.length > 0) {
    const first = local[0]
    if (!first) return
    const fallbackName = cur.process || first.name
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
    form.processName = name
    return
  }

  const recRaw = await getFdmProcess(name)
  if (!recRaw) return
  const rec = clonePlain(recRaw)
  const normalizedRanges: FdmProcessRange[] = Array.isArray((rec as any).ranges)
    ? (rec as any).ranges.map((r: any) => ({
        fromLayer: Number(r.fromLayer) || 0,
        toLayer: Number(r.toLayer) || 0,
        sliceHeight: r.sliceHeight,
        outputTemp: r.outputTemp,
        outputFeedrate: r.outputFeedrate,
        outputFanSpeed: r.outputFanSpeed,
        outputRetractDist: r.outputRetractDist,
      }))
    : []

  Object.assign(form, { ...rec, processName: name, ranges: normalizedRanges })
}

async function onSave() {
  if (!selectedName.value || !isLocalSelected.value) {
    ElMessage.warning('请选择一个本地工艺再保存')
    return
  }
  await saveFdmProcess(selectedName.value, form)
  ElMessage.success('工艺已保存')
  await load()
}

async function onDelete(name: string) {
  await ElMessageBox.confirm(`确认删除本地工艺 "${name}"?`, '提示', {
    type: 'warning',
  })
  await deleteFdmProcess(name)
  ElMessage.success('已删除')
  if (selectedName.value === name) {
    selectedName.value = null
    hasSelection.value = false
  }
  await load()
}

async function onCloneFromCurrent() {
  const { value: name } = await ElMessageBox.prompt('请输入新工艺名称', '从当前工艺复制', {
    inputPlaceholder: '例如：My PLA Fast',
  })
  if (!name) return
  await cloneFdmProcessFromCurrent(name)
  ElMessage.success('已从当前工艺复制为本地工艺')
  await load()
  await select(name, true)
}

function addRange() {
  if (!form.ranges) form.ranges = []
  if (form.ranges.length >= 3) return
  form.ranges.push({
    fromLayer: 0,
    toLayer: 10,
  })
}

function removeRange(idx: number) {
  if (!form.ranges) return
  form.ranges.splice(idx, 1)
}

async function onSetCurrent(name: string) {
  await setCurrentProcess(name)
  currentProcess.value = name
  ElMessage.success('已设为当前工艺')
}
</script>

<style scoped>
.proc-card {
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
