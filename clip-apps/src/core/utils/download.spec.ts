import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlob, downloadText } from './download'

describe('core.utils.download', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloadBlob wires object URL, anchor click, and revoke', () => {
    const click = vi.fn()
    const anchor = { click, href: '', download: '' } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')

    downloadBlob('part.stl', new Blob(['abc']))

    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(anchor.href).toBe('blob:mock')
    expect(anchor.download).toBe('part.stl')
    expect(click).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith('blob:mock')
  })

  it('downloadText passes default json mime to blob', () => {
    const click = vi.fn()
    const anchor = { click, href: '', download: '' } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      expect(blob.type).toContain('json')
      return 'blob:json'
    })

    downloadText('meta.json', '{"k":1}')

    expect(createUrl).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('downloadText forwards custom mime', () => {
    const click = vi.fn()
    const anchor = { click, href: '', download: '' } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob) => {
      expect(blob.type).toBe('text/plain;charset=utf-8')
      return 'blob:text'
    })

    downloadText('x.txt', 'hello', 'text/plain;charset=utf-8')

    expect(createUrl).toHaveBeenCalledTimes(1)
  })
})
