import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  assertCarveraSdRmPath,
  isCarveraSdDirEntry,
  mockListCarveraSd,
  normalizeCarveraListPath,
  parseCarveraLsResponse,
} from './list.ts'

describe('carvera list path', () => {
  it('defaults and strips trailing slash', () => {
    assert.equal(normalizeCarveraListPath(undefined), '/sd/gcodes')
    assert.equal(normalizeCarveraListPath('/sd/gcodes/'), '/sd/gcodes')
    assert.equal(normalizeCarveraListPath('sd/gcodes'), '/sd/gcodes')
  })

  it('rejects /ud', () => {
    assert.throws(() => normalizeCarveraListPath('/ud'), /forbidden/)
    assert.throws(() => normalizeCarveraListPath('/ud/x'), /forbidden/)
  })
})

describe('parseCarveraLsResponse', () => {
  it('parses names/sizes and drops ud + EOT', () => {
    const text = 'gcodes/ \ncube.nc 1234\nud/ \nother.nc 9\x04'
    const list = parseCarveraLsResponse(text)
    assert.deepEqual(list, [
      { name: 'gcodes/', size: '' },
      { name: 'cube.nc', size: '1234' },
      { name: 'other.nc', size: '9' },
    ])
  })
})

describe('mockListCarveraSd', () => {
  it('walks / → /sd → /sd/gcodes and lists files', () => {
    const files = new Map<string, Buffer>([
      ['/sd/gcodes/a.nc', Buffer.from('aa')],
      ['/sd/gcodes/sub/b.nc', Buffer.from('bbb')],
    ])
    assert.deepEqual(mockListCarveraSd(files, '/').list, [{ name: 'sd/', size: '' }])
    assert.deepEqual(mockListCarveraSd(files, '/sd').list, [{ name: 'gcodes/', size: '' }])
    const g = mockListCarveraSd(files, '/sd/gcodes')
    assert.equal(g.path, '/sd/gcodes')
    assert.ok(g.list.some((e) => e.name === 'a.nc' && e.size === '2'))
    assert.ok(g.list.some((e) => e.name === 'sub/'))
  })
})

describe('rm guards', () => {
  it('only allows files under /sd/gcodes/', () => {
    assert.throws(() => assertCarveraSdRmPath('/sd/gcodes'), /refused/)
    assert.throws(() => assertCarveraSdRmPath('/sd/foo.nc'), /refused/)
    assert.doesNotThrow(() => assertCarveraSdRmPath('/sd/gcodes/job.nc'))
  })
})

describe('isCarveraSdDirEntry', () => {
  it('detects directory markers', () => {
    assert.equal(isCarveraSdDirEntry('gcodes/'), true)
    assert.equal(isCarveraSdDirEntry('sub/'), true)
    assert.equal(isCarveraSdDirEntry('a.nc'), false)
  })
})
