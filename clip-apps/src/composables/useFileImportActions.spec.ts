import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
  },
}))

import { ElMessage } from 'element-plus'
import { useFileImportActions } from './useFileImportActions'

let readerResult = ''
let readerShouldError = false

beforeEach(() => {
  readerResult = ''
  readerShouldError = false
  vi.spyOn(globalThis, 'FileReader').mockImplementation(function FileReaderMock(this: unknown) {
    const self = this as {
      result: string
      onload: (() => void) | null
      onerror: (() => void) | null
      readAsText: () => void
    }
    self.onload = null
    self.onerror = null
    self.result = ''
    self.readAsText = () => {
      queueMicrotask(() => {
        if (readerShouldError) {
          self.onerror?.()
        } else {
          self.result = readerResult
          self.onload?.()
        }
      })
    }
    return self
  } as unknown as typeof FileReader)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.mocked(ElMessage.error).mockClear()
})

function makeChangeEventWithFile(content: string, name: string, type: string) {
  readerResult = content
  const file = new File([content], name, { type })
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  const ev = new Event('change', { bubbles: true })
  Object.defineProperty(ev, 'target', { value: input, configurable: true })
  return ev
}

describe('composables.useFileImportActions', () => {
  it('importTextFromInput does nothing when no file selected', async () => {
    const { importTextFromInput } = useFileImportActions()
    const input = document.createElement('input')
    Object.defineProperty(input, 'files', { value: [], configurable: true })
    const ev = new Event('change')
    Object.defineProperty(ev, 'target', { value: input, configurable: true })
    const onSuccess = vi.fn()
    await importTextFromInput(ev, { onSuccess })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('importTextFromInput reads file and clears input', async () => {
    const { importTextFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('hello', 'a.txt', 'text/plain')
    const input = (ev.target as HTMLInputElement)!
    const onSuccess = vi.fn()
    await importTextFromInput(ev, { onSuccess })
    expect(onSuccess).toHaveBeenCalledWith('hello', expect.any(File))
    expect(input.value).toBe('')
  })

  it('importTextFromInput shows default read failed message when FileReader errors', async () => {
    readerShouldError = true
    const { importTextFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('x', 'a.txt', 'text/plain')
    const onSuccess = vi.fn()
    await importTextFromInput(ev, { onSuccess })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith('读取文件失败')
  })

  it('importJsonFromInput parses JSON and awaits async onSuccess', async () => {
    const { importJsonFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('{"k":1}', 'j.json', 'application/json')
    const onSuccess = vi.fn(async () => {})
    await importJsonFromInput(ev, {
      invalidMessage: 'bad json',
      parse: (p) => p as { k: number },
      onSuccess,
    })
    expect(onSuccess).toHaveBeenCalledWith({ k: 1 })
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('importJsonFromInput does nothing when no file selected', async () => {
    const { importJsonFromInput } = useFileImportActions()
    const input = document.createElement('input')
    Object.defineProperty(input, 'files', { value: [], configurable: true })
    const ev = new Event('change')
    Object.defineProperty(ev, 'target', { value: input, configurable: true })
    const onSuccess = vi.fn()
    await importJsonFromInput(ev, {
      invalidMessage: 'bad',
      parse: (p) => p,
      onSuccess,
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('importJsonFromInput shows invalidMessage on JSON syntax error', async () => {
    const { importJsonFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('{', 'x.json', 'application/json')
    await importJsonFromInput(ev, {
      invalidMessage: 'syntax-bad',
      parse: (p) => p as object,
      onSuccess: vi.fn(),
    })
    expect(ElMessage.error).toHaveBeenCalledWith('syntax-bad')
  })

  it('importJsonFromInput shows invalidMessage on parse failure', async () => {
    const { importJsonFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('not-json', 'x.json', 'application/json')
    await importJsonFromInput(ev, {
      invalidMessage: 'invalid-json',
      parse: () => {
        throw new Error('parse')
      },
      onSuccess: vi.fn(),
    })
    expect(ElMessage.error).toHaveBeenCalledWith('invalid-json')
  })

  it('importJsonFromInput uses readFailedMessage when FileReader fails', async () => {
    readerShouldError = true
    const { importJsonFromInput } = useFileImportActions()
    const ev = makeChangeEventWithFile('{}', 'x.json', 'application/json')
    await importJsonFromInput(ev, {
      invalidMessage: 'invalid-json',
      readFailedMessage: 'cannot-read',
      parse: (p) => p as object,
      onSuccess: vi.fn(),
    })
    expect(ElMessage.error).toHaveBeenCalledWith('cannot-read')
  })
})
