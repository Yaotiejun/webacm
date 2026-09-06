<template>
  <el-tooltip placement="top">
    <template #content>
      <div class="warning-tooltip">
        <div v-for="(line, idx) in lines" :key="`warn-line-${idx}`" class="warning-tooltip-line">
          <span class="warning-badge" :class="line.level === 'error' ? 'warning-badge-error' : 'warning-badge-warn'">
            {{ line.level === 'error' ? 'ERR' : 'WARN' }}
          </span>
          <span>{{ line.text }}</span>
        </div>
      </div>
    </template>
    <el-tag :type="tagType" size="small" effect="plain">{{ tagLabel }}</el-tag>
  </el-tooltip>
</template>

<script setup lang="ts">
type WarningLine = { level: 'warning' | 'error'; text: string }

defineProps<{
  lines: WarningLine[]
  tagType: 'warning' | 'danger'
  tagLabel: string
}>()
</script>

<style scoped>
.warning-tooltip {
  max-width: 520px;
  line-height: 1.5;
}
.warning-tooltip-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.warning-badge {
  font-size: 11px;
  line-height: 1;
  border-radius: 3px;
  padding: 2px 4px;
  margin-top: 2px;
  flex: 0 0 auto;
}
.warning-badge-error {
  background: #f56c6c;
  color: #fff;
}
.warning-badge-warn {
  background: #e6a23c;
  color: #fff;
}
</style>
