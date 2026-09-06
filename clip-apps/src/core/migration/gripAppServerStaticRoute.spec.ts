// @vitest-environment node
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { createGripAppServerRequestContext } from './gripAppServerRequestContext'
import {
  createGripMemoryStaticRoot,
  GripAppServerStaticRouter,
  matchGripAppHost,
  matchGripAppSyncRoute,
  parseGripAppStaticMounts,
  resolveGripStaticFilePath,
  stripGripStaticPrefix,
} from './gripAppServerStaticRoute'

describe('gripAppServerStaticRoute', () => {
  it('stripGripStaticPrefix matches grip handleStatic rewrite', () => {
    expect(stripGripStaticPrefix('/app/foo', '/app')).toEqual({
      matched: true,
      original: '/app/foo',
      rewritten: '/foo',
    })
    expect(stripGripStaticPrefix('/app', '/app').rewritten).toBe('/')
  })

  it('matchGripAppHost honors wildcard', () => {
    expect(matchGripAppHost('localhost:8080', ['*'])).toBe(true)
    expect(matchGripAppHost('x', ['y'])).toBe(false)
  })

  it('resolveGripStaticFilePath blocks directory traversal', () => {
    const root = join(tmpdir(), 'grip-static-root')
    expect(resolveGripStaticFilePath(root, '/../etc/passwd')).toBeNull()
  })

  it('parseGripAppStaticMounts sorts longest prefix first', () => {
    const mounts = parseGripAppStaticMounts({ '/': 'www', '/lib': 'public' })
    expect(mounts[0]!.prefix).toBe('/lib')
  })

  it('GripAppServerStaticRouter honors meta.secure and HEAD', () => {
    const router = new GripAppServerStaticRouter()
    router.registerModule({
      name: 'secure',
      meta: { host: ['*'], secure: true, static: { '/app': 'www' } },
      roots: { www: createGripMemoryStaticRoot({ '/index.html': 'ok' }) },
    })
    expect(
      router.handle({ method: 'GET', url: '/app/index.html', host: 'h', secure: false })?.statusCode,
    ).toBe(404)
    const get = router.handle({
      method: 'GET',
      url: '/app/index.html',
      host: 'h',
      secure: true,
    })
    expect(get?.statusCode).toBe(200)
    const head = router.handle({
      method: 'HEAD',
      url: '/app/index.html',
      host: 'h',
      secure: true,
    })
    expect(head?.statusCode).toBe(200)
    expect(head?.body).toBe('')
  })

  it('GripAppServerStaticRouter serves memory static via registerModule', () => {
    const router = new GripAppServerStaticRouter()
    router.registerModule({
      name: 'demo',
      meta: { host: ['localhost:9999'], static: { '/clip': 'dist' } },
      roots: {
        dist: createGripMemoryStaticRoot({
          '/index.html': '<!doctype html><title>shape_cam</title>',
        }),
      },
    })
    const res = router.handle({
      method: 'GET',
      url: '/clip/index.html',
      host: 'localhost:9999',
    })
    expect(res?.statusCode).toBe(200)
    expect(res?.body).toContain('shape_cam')
    expect(router.handle({ method: 'GET', url: '/clip/nope', host: 'localhost:9999' })?.statusCode).toBe(
      404,
    )
  })

  it('GripAppServerStaticRouter serves disk mounts via register()', () => {
    const dir = join(tmpdir(), `grip-static-${Date.now()}`)
    const www = join(dir, 'www')
    mkdirSync(www, { recursive: true })
    writeFileSync(join(www, 'index.html'), '<html>ok</html>')
    const router = new GripAppServerStaticRouter()
    router.register('/files', www)
    const hit = router.resolveRequestUrl('/files/index.html')
    expect(hit.kind).not.toBe('miss')
    rmSync(dir, { recursive: true, force: true })
  })

  it('createGripAppServerRequestContext exposes params.getBoolean', () => {
    const ctx = createGripAppServerRequestContext('/api?verbose=true')
    expect(ctx.getBoolean('verbose')).toBe(true)
    expect(matchGripAppSyncRoute(ctx, 'GET', 'GET', '/api')).toBe(true)
  })
})
