<template>
  <div v-if="sending" class="job-send-progress" role="status" aria-live="polite" data-testid="job-send-progress">
    <div class="job-send-progress__label">
      发送队列：{{ sent }} / {{ total }} 行（{{ percent }}%）
    </div>
    <el-progress :percentage="percent" :stroke-width="10" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sending: boolean
  sent: number
  total: number
}>()

const percent = computed(() => {
  if (!props.total) return 0
  return Math.min(100, Math.round((props.sent / props.total) * 100))
})
</script>

<style scoped>
.job-send-progress {
  margin-top: 8px;
  max-width: 280px;
}
.job-send-progress__label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}
</style>
