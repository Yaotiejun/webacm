import { ElMessage } from 'element-plus'

interface ImportJsonFromInputOptions<T> {
  invalidMessage: string
  readFailedMessage?: string
  parse: (parsed: unknown) => T
  onSuccess: (value: T) => void | Promise<void>
}

interface ImportTextFromInputOptions {
  readFailedMessage?: string
  onSuccess: (text: string, file: File) => void
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('read-failed'))
    reader.readAsText(file)
  })
}

export function useFileImportActions() {
  const importTextFromInput = async (event: Event, options: ImportTextFromInputOptions) => {
    const target = event.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return
    try {
      const text = await readFileAsText(file)
      options.onSuccess(text, file)
    } catch (error) {
      console.error('[file-import-actions] import text failed', error)
      const readFailedMessage = options.readFailedMessage ?? '读取文件失败'
      ElMessage.error(readFailedMessage)
    } finally {
      if (target) target.value = ''
    }
  }

  const importJsonFromInput = async <T>(event: Event, options: ImportJsonFromInputOptions<T>) => {
    const target = event.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return
    try {
      const text = await readFileAsText(file)
      const parsed = JSON.parse(text)
      const value = options.parse(parsed)
      await Promise.resolve(options.onSuccess(value))
    } catch (error) {
      console.error('[file-import-actions] import json failed', error)
      const readFailedMessage = options.readFailedMessage ?? '读取文件失败'
      const isReadFailed = error instanceof Error && error.message === 'read-failed'
      ElMessage.error(isReadFailed ? readFailedMessage : options.invalidMessage)
    } finally {
      if (target) target.value = ''
    }
  }

  return {
    importTextFromInput,
    importJsonFromInput,
  }
}
