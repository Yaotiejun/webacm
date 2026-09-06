import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COPY_FAILURE_MESSAGE } from '@/core/copyFeedbackMessages'

const { elSuccess, elError, downloadText, downloadBlob } = vi.hoisted(() => ({
  elSuccess: vi.fn(),
  elError: vi.fn(),
  downloadText: vi.fn(),
  downloadBlob: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: elSuccess,
    error: elError,
  },
}))

vi.mock('@/core/utils/download', () => ({
  downloadText,
  downloadBlob,
}))

import { useExportActions } from './useExportActions'

describe('composables.useExportActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('copyText writes clipboard and shows success', async () => {
    const { copyText } = useExportActions()
    const ok = await copyText('hello', 'done')
    expect(ok).toBe(true)
    expect(navigator.clipboard!.writeText).toHaveBeenCalledWith('hello')
    expect(elSuccess).toHaveBeenCalledWith('done')
    expect(elError).not.toHaveBeenCalled()
  })

  it('copyText returns false and surfaces COPY_FAILURE_MESSAGE when clipboard rejects', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const { copyText } = useExportActions()
    const ok = await copyText('hello', 'done')
    expect(ok).toBe(false)
    expect(elError).toHaveBeenCalledWith(COPY_FAILURE_MESSAGE)
    expect(elSuccess).not.toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('copyText uses textarea + execCommand fallback when clipboard API is missing', async () => {
    vi.stubGlobal('navigator', { clipboard: undefined } as unknown as Navigator)
    const ta = {
      value: '',
      setAttribute: vi.fn(),
      style: {} as CSSStyleDeclaration,
      select: vi.fn(),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(ta as unknown as HTMLTextAreaElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation((n) => n as never)
    vi.spyOn(document.body, 'removeChild').mockImplementation((n) => n as never)
    const execCmd = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { value: execCmd, configurable: true })

    try {
      const { copyText } = useExportActions()
      const ok = await copyText('fallback', 'copied')
      expect(ok).toBe(true)
      expect(ta.value).toBe('fallback')
      expect(ta.select).toHaveBeenCalled()
      expect(execCmd).toHaveBeenCalledWith('copy')
      expect(elSuccess).toHaveBeenCalledWith('copied')
    } finally {
      Reflect.deleteProperty(document, 'execCommand')
    }
  })

  it('copyJson stringifies payload with indentation', async () => {
    const { copyJson } = useExportActions()
    await copyJson({ a: 1 }, 'json ok')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(JSON.stringify({ a: 1 }, null, 2))
    expect(elSuccess).toHaveBeenCalledWith('json ok')
  })

  it('exportJson calls downloadText and shows success', () => {
    const { exportJson } = useExportActions()
    exportJson('out.json', { x: 2 }, 'exported')
    expect(downloadText).toHaveBeenCalledWith('out.json', JSON.stringify({ x: 2 }, null, 2))
    expect(elSuccess).toHaveBeenCalledWith('exported')
  })

  it('exportText forwards mime to downloadText', () => {
    const { exportText } = useExportActions()
    exportText('a.txt', 'hi', 'saved', 'text/plain;charset=utf-8')
    expect(downloadText).toHaveBeenCalledWith('a.txt', 'hi', 'text/plain;charset=utf-8')
    expect(elSuccess).toHaveBeenCalledWith('saved')
  })

  it('exportBlob delegates to downloadBlob', () => {
    const { exportBlob } = useExportActions()
    const blob = new Blob(['z'])
    exportBlob('f.bin', blob, 'blob ok')
    expect(downloadBlob).toHaveBeenCalledWith('f.bin', blob)
    expect(elSuccess).toHaveBeenCalledWith('blob ok')
  })
})
