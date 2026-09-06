<template>
  <el-card class="jobs-card">
    <template #header>
      <div class="card-header">
        <span>FDM Jobs（本地）</span>
        <el-button @click="load" plain>刷新</el-button>
      </div>
    </template>

    <el-empty v-if="jobs.length === 0" description="尚未保存任何 Job" />

    <el-table v-else :data="jobs" border style="width: 100%" @row-click="onOpen">
      <el-table-column prop="name" label="名称" min-width="220" />
      <el-table-column label="创建时间" min-width="180">
        <template #default="scope">
          {{ new Date(scope.row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="设备/工艺/材料" min-width="240">
        <template #default="scope">
          {{ scope.row.device }} / {{ scope.row.process }} / {{ scope.row.material }}
        </template>
      </el-table-column>

      <el-table-column label="尺寸" width="180">
        <template #default="scope">
          <span v-if="scope.row.jobBounds">
            {{ scope.row.jobBounds.size.x.toFixed(1) }}×{{ scope.row.jobBounds.size.y.toFixed(1) }}×{{
              scope.row.jobBounds.size.z.toFixed(1)
            }}
          </span>
          <span v-else class="hint">-</span>
        </template>
      </el-table-column>

      <el-table-column label="模型数" width="80">
        <template #default="scope">
          {{ scope.row.models.length }}
        </template>
      </el-table-column>

      <el-table-column label="体积/最大边" min-width="180">
        <template #default="scope">
          <span v-if="scope.row.jobBounds">
            <span>
              max={{ Math.max(
                scope.row.jobBounds.size.x,
                scope.row.jobBounds.size.y,
                scope.row.jobBounds.size.z,
              ).toFixed(1) }}
            </span>
            <span style="margin-left: 8px">
              vol={{
                (
                  scope.row.jobBounds.size.x *
                  scope.row.jobBounds.size.y *
                  scope.row.jobBounds.size.z
                ).toFixed(0)
              }}
            </span>
          </span>
          <span v-else class="hint">-</span>
        </template>
      </el-table-column>
      <el-table-column label="摘要" min-width="220">
        <template #default="scope">
          <span v-if="scope.row.summary">
            {{ scope.row.summary.layers }}层 · {{ scope.row.summary.timeMinutes.toFixed(1) }}min ·
            {{ Math.round(scope.row.summary.filamentMm) }}mm
          </span>
          <span v-else class="hint">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="backend" label="后端" width="90">
        <template #default="scope">
          <span v-if="scope.row.backend">{{ scope.row.backend }}</span>
          <span v-else class="hint">-</span>
        </template>
      </el-table-column>
      <el-table-column label="诊断快照" width="88">
        <template #default="scope">
          <el-tag v-if="scope.row.currentDiagnosticsSnapshot?.trim()" size="small" type="info">诊断</el-tag>
          <el-tag v-if="scope.row.sliceInputMeta" size="small" type="success" style="margin-left: 2px">网格</el-tag>
          <span v-if="!scope.row.currentDiagnosticsSnapshot?.trim() && !scope.row.sliceInputMeta" class="hint">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click.stop="onOpen(scope.row)">打开</el-button>
          <el-button
            v-if="scope.row.currentDiagnosticsSnapshot?.trim()"
            size="small"
            text
            type="info"
            @click.stop="onCopyDiagnostics(scope.row)"
          >
            复制诊断
          </el-button>
          <el-button type="danger" size="small" @click.stop="onDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="hint" style="margin-top: 10px">
      打开 Job 会切换当前 设备/工艺/材料，并进入 FDM 工作区；模型几何需手动重新导入。
      <span v-if="jobs.some((j) => j.backend === 'kiri')">（Kiri Job 会自动恢复切片后端选择）</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { listFdmJobs, deleteFdmJob, type FdmJobRecord } from '@/api/jobs'
import { clonePlain } from '@/core/clonePlain'
import { setCurrentDevice, setCurrentProcess, setCurrentMaterial } from '@/api/current'
import { useExportActions } from '@/composables/useExportActions'

const router = useRouter()
const { copyText } = useExportActions()
const jobs = ref<FdmJobRecord[]>([])

async function load() {
  const list = clonePlain(await listFdmJobs()) as FdmJobRecord[]
  // 按更新时间倒序，最近的 Job 排在最前
  list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  jobs.value = list
}

onMounted(async () => {
  await load()
})

async function onOpen(job: FdmJobRecord) {
  await setCurrentDevice(job.device)
  await setCurrentProcess(job.process)
  await setCurrentMaterial(job.material)
  router.push({ path: '/fdm', query: { jobId: job.id } })
}

async function onCopyDiagnostics(job: FdmJobRecord) {
  const text = job.currentDiagnosticsSnapshot?.trim()
  if (!text) {
    ElMessage.info('该 Job 没有保存的诊断快照')
    return
  }
  const header = `jobId=${job.id}\njobName=${job.name}\n`
  await copyText(header + text, 'Job 诊断快照已复制')
}

async function onDelete(job: FdmJobRecord) {
  await ElMessageBox.confirm(`确认删除 Job "${job.name}"?`, '提示', { type: 'warning' })
  await deleteFdmJob(job.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<style scoped>
.jobs-card {
  max-width: 1200px;
  margin: 0 auto;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hint {
  color: #909399;
}
</style>
