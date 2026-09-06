<template>
  <div
    v-if="showBar"
    class="migration-bar"
    :title="`grip → shape_cam · 主路径 ${primaryPct}% · 全量 ${strictPct}%`"
  >
    <span class="label">迁移</span>
    <el-progress :percentage="primaryPct" :stroke-width="6" :show-text="false" style="width: 120px" />
    <span class="pct">{{ primaryPct }}%</span>
    <span class="strict">全量 {{ strictPct }}%</span>
    <span v-if="gateLabel" class="gate">{{ gateLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { computeMigrationProgressTotals } from '@/core/migration/migrationProgressScoreboard'

const showBar = import.meta.env.DEV
const totals = computeMigrationProgressTotals()
const primaryPct = computed(() => Math.round(totals.primaryProductPathPct))
const strictPct = computed(() => Math.round(totals.strictTotalPct))
const gateLabel = import.meta.env.VITE_MIGRATION_GATE_LABEL as string | undefined
</script>

<style scoped>
.migration-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #606266;
}
.label {
  font-weight: 600;
}
.pct {
  min-width: 36px;
}
.strict {
  color: #909399;
  font-size: 11px;
}
.gate {
  color: #909399;
  font-size: 11px;
}
</style>
