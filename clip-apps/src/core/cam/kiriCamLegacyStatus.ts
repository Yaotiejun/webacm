import { getKiriCamLegacyHealth } from '@/core/cam/kiriCamRuntime'

export interface KiriCamLegacyStatus {
  label: string
  readyForLegacyJob: boolean
  hintLevel: 'success' | 'warning' | 'error'
}

/**
 * Actionable Legacy bridge status for CAM workspace UI.
 */
export function formatKiriCamLegacyStatus(): KiriCamLegacyStatus {
  const h = getKiriCamLegacyHealth()
  const mode = String(import.meta.env.VITE_KIRI_LEGACY_CAM ?? 'auto')

  if (mode === '0') {
    return {
      label:
        'Legacy 已关闭（VITE_KIRI_LEGACY_CAM=0）。将使用 bbox 估算与示意 G-code；在 .env.development 设为 1 或 auto 后重启 dev server。',
      readyForLegacyJob: false,
      hintLevel: 'warning',
    }
  }

  if (!h.ready) {
    return {
      label: h.initErrorMessage
        ? `Legacy 运行时未就绪：${h.initErrorMessage}`
        : 'Legacy 运行时尚未完成初始化（请稍候或刷新页面）',
      readyForLegacyJob: false,
      hintLevel: 'error',
    }
  }

  const impl = `cam_slice=${h.hasSlice ? '已加载' : '未加载'}，cam_export=${h.hasExport ? '已加载' : '未加载'}`
  const ready = h.hasSlice && h.hasExport

  if (ready) {
    return {
      label: `Legacy 就绪（${impl}）。导入 STL 后点「生成 CAM 刀路」可得 kiri-cam 真刀路。`,
      readyForLegacyJob: true,
      hintLevel: 'success',
    }
  }

  if (h.hasSlice && !h.hasExport) {
    return {
      label: `${impl}。仅 slice 可用：将生成 kiri-cam-slice-only 诊断 G-code；检查 export.js 动态 import。${
        h.legacyImportErrorMessage ? ` 错误：${h.legacyImportErrorMessage}` : ''
      }`,
      readyForLegacyJob: true,
      hintLevel: 'warning',
    }
  }

  const err = h.legacyImportErrorMessage
  return {
    label: `${impl}。无法加载 legacy CAM（${mode === '1' ? 'strict' : 'auto'} 模式）。${
      err ? ` import 失败：${err}` : ' 请确认 dev server 可访问 src/core/cam/legacy/kiri 且 three 已安装。'
    } 当前将回退 cam-placeholder。`,
    readyForLegacyJob: false,
    hintLevel: 'error',
  }
}
