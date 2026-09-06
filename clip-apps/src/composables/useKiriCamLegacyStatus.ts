import { onBeforeUnmount, onMounted, ref } from 'vue'
import { formatKiriCamLegacyStatus } from '@/core/cam/kiriCamLegacyStatus'
import { kiriCamRuntime } from '@/core/cam/kiriCamRuntime'

export function useKiriCamLegacyStatus(pollUntilReady = true) {
  const label = ref('')
  const hintLevel = ref<'success' | 'warning' | 'error'>('warning')
  const readyForLegacyJob = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | undefined

  function refresh() {
    const status = formatKiriCamLegacyStatus()
    label.value = status.label
    hintLevel.value = status.hintLevel
    readyForLegacyJob.value = status.readyForLegacyJob
  }

  onMounted(() => {
    refresh()
    void kiriCamRuntime.init().finally(refresh)
    if (pollUntilReady) {
      pollTimer = setInterval(() => {
        refresh()
        if (readyForLegacyJob.value && pollTimer != null) {
          clearInterval(pollTimer)
          pollTimer = undefined
        }
      }, 400)
    }
  })

  onBeforeUnmount(() => {
    if (pollTimer != null) clearInterval(pollTimer)
  })

  return { label, hintLevel, readyForLegacyJob, refresh }
}
