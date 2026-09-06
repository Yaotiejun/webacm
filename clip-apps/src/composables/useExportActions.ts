import { ElMessage } from 'element-plus'
import { downloadBlob, downloadText } from '@/core/utils/download'
import { COPY_FAILURE_MESSAGE } from '@/core/copyFeedbackMessages'

async function writeClipboardWithFallback(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function useExportActions() {
  const copyText = async (text: string, successMessage: string) => {
    try {
      await writeClipboardWithFallback(text)
      ElMessage.success(successMessage)
      return true
    } catch (error) {
      console.error('[export-actions] copy failed', error)
      ElMessage.error(COPY_FAILURE_MESSAGE)
      return false
    }
  }

  const copyJson = async (payload: unknown, successMessage: string) => {
    return copyText(JSON.stringify(payload, null, 2), successMessage)
  }

  const exportJson = (filename: string, payload: unknown, successMessage: string) => {
    downloadText(filename, JSON.stringify(payload, null, 2))
    ElMessage.success(successMessage)
  }

  const exportText = (filename: string, text: string, successMessage: string, mime?: string) => {
    downloadText(filename, text, mime)
    ElMessage.success(successMessage)
  }

  const exportBlob = (filename: string, blob: Blob, successMessage: string) => {
    downloadBlob(filename, blob)
    ElMessage.success(successMessage)
  }

  return {
    copyText,
    copyJson,
    exportJson,
    exportText,
    exportBlob,
  }
}
