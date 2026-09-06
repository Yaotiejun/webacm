<template>
  <el-card class="jobs-card">
    <template #header>
      <div class="card-header">
        <span>Carvera Jobs（本地）</span>
        <el-button @click="load" plain>刷新</el-button>
      </div>
    </template>

    <el-empty v-if="jobs.length === 0" description="尚未保存任何 Carvera Job" />

    <el-table v-else :data="jobs" border style="width: 100%" @row-click="onOpen">
      <el-table-column prop="name" label="名称" min-width="220" />
      <el-table-column label="创建时间" min-width="180">
        <template #default="scope">
          {{ new Date(scope.row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="大小" width="120">
        <template #default="scope">
          <span v-if="scope.row.size != null">
            {{ (scope.row.size / 1024).toFixed(1) }} KB
          </span>
          <span v-else class="hint">-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="scope">
          <el-button type="primary" size="small" @click.stop="onOpen(scope.row)">打开</el-button>
          <el-button type="danger" size="small" @click.stop="onDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="hint" style="margin-top: 10px">
      打开 Job 会在 Carvera 控制页中选择该作业，并载入其 G-code 内容。
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { listCarveraJobs, deleteCarveraJob, type CarveraJobRecord } from '@/api/jobs'
import { clonePlain } from '@/core/clonePlain'
import { useCarveraStore } from '@/stores/useCarveraStore'

const router = useRouter()
const store = useCarveraStore()
const jobs = ref<CarveraJobRecord[]>([])

async function load() {
  const list = clonePlain(await listCarveraJobs()) as CarveraJobRecord[]
  list.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  jobs.value = list
}

onMounted(async () => {
  await load()
})

async function onOpen(job: CarveraJobRecord) {
  store.selectJob(job.id)
  router.push({ path: '/carvera' })
}

async function onDelete(job: CarveraJobRecord) {
  await ElMessageBox.confirm(`确认删除 Job "${job.name}"?`, '提示', { type: 'warning' })
  await deleteCarveraJob(job.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<style scoped>
.jobs-card {
  max-width: 1000px;
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
