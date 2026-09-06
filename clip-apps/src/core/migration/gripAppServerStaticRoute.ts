import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, normalize, posix, relative, resolve } from 'node:path'
import { gripAppServerNoCacheHeaders } from '@/core/migration/gripAppServerLocal'
import { GRIP_APP_SERVER_404_BODY } from '@/core/migration/gripAppServerHttp'

/** One `app.json` `static` entry: URL prefix → disk folder key. */
export interface GripAppStaticMount {
  prefix: string
  rootKey: string
}

export interface GripAppModuleMeta {
  host?: readonly string[]
  static?: Record<string, string>
  secure?: boolean
}

export interface GripAppServerStaticResponse {
  statusCode: number
  body: string
  headers: Record<string, string>
}

/** In-memory static tree (`path` → UTF-8 body). */
export type GripMemoryStaticRoot = ReadonlyMap<string, string>

export function createGripMemoryStaticRoot(
  files: Record<string, string>,
): GripMemoryStaticRoot {
  const map = new Map<string, string>()
  for (const [path, body] of Object.entries(files)) {
    const key = path.startsWith('/') ? path : `/${path}`
    map.set(key, body)
  }
  return map
}

/**
 * grip `handleStatic(prefix, path)` — rewrite `req.url` under prefix.
 */
export function stripGripStaticPrefix(
  url: string,
  prefix: string,
): { matched: boolean; original: string; rewritten: string } {
  if (!prefix || !url.startsWith(prefix)) {
    return { matched: false, original: url, rewritten: url }
  }
  let nurl = url.slice(prefix.length)
  if (nurl === '') nurl = '/'
  else if (!nurl.startsWith('/')) nurl = `/${nurl}`
  return { matched: true, original: url, rewritten: nurl }
}

/** grip module host list (`meta.host` or `["*"]`). */
export function matchGripAppHost(
  host: string | undefined,
  allowedHosts: readonly string[],
): boolean {
  if (!host) return false
  return allowedHosts.includes('*') || allowedHosts.includes(host)
}

/** Parse `app.json` `static` object into sorted mounts (longest prefix first). */
export function parseGripAppStaticMounts(
  staticMeta: Record<string, string> | undefined,
): GripAppStaticMount[] {
  if (!staticMeta || typeof staticMeta !== 'object') return []
  const mounts = Object.entries(staticMeta).map(([prefix, rootKey]) => ({
    prefix,
    rootKey,
  }))
  mounts.sort((a, b) => b.prefix.length - a.prefix.length)
  return mounts
}

function normalizeUrlPath(pathname: string): string {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return posix.normalize(p)
}

function memoryLookup(root: GripMemoryStaticRoot, pathname: string): string | null {
  const rel = normalizeUrlPath(pathname)
  if (rel.includes('..')) return null
  if (root.has(rel)) return root.get(rel)!
  if (rel.endsWith('/') && root.has(`${rel}index.html`)) return root.get(`${rel}index.html`)!
  if (rel === '/' && root.has('/index.html')) return root.get('/index.html')!
  const alt = rel.endsWith('/') ? rel.slice(0, -1) : rel
  return root.get(alt) ?? null
}

/**
 * Resolve a URL path under a filesystem static root; null if traversal escape.
 */
export function resolveGripStaticFilePath(
  rootDir: string,
  pathname: string,
): string | null {
  if (pathname.includes('..')) return null
  const rel = normalizeUrlPath(pathname)
  if (rel.includes('..')) return null
  const absRoot = resolve(rootDir)
  const relFile = rel === '/' ? 'index.html' : rel.replace(/^\//, '')
  const candidate = resolve(absRoot, relFile)
  const relToRoot = relative(absRoot, candidate)
  if (relToRoot.startsWith('..') || isAbsolute(relToRoot)) return null
  return candidate
}

type GripStaticRoot =
  | { kind: 'memory'; root: GripMemoryStaticRoot }
  | { kind: 'disk'; rootDir: string }

interface GripAppModuleRecord {
  name: string
  meta: GripAppModuleMeta
  mounts: GripAppStaticMount[]
  roots: Record<string, GripStaticRoot>
}

/**
 * In-process app-server static stub: host routing + `meta.static` prefix mounts.
 * Mirrors grip `updateApp` static registration without Connect/serve-static.
 */
export class GripAppServerStaticRouter {
  private readonly modules: GripAppModuleRecord[] = []

  registerModule(opts: {
    name: string
    meta: GripAppModuleMeta
    roots: Record<string, GripMemoryStaticRoot | string>
  }): void {
    const roots: Record<string, GripStaticRoot> = {}
    for (const [key, value] of Object.entries(opts.roots)) {
      roots[key] =
        typeof value === 'string'
          ? { kind: 'disk', rootDir: value }
          : { kind: 'memory', root: value }
    }
    this.modules.push({
      name: opts.name,
      meta: opts.meta,
      mounts: parseGripAppStaticMounts(opts.meta.static),
      roots,
    })
  }

  /** Register a single prefix against an on-disk folder (tests). */
  register(prefix: string, rootDir: string): void {
    this.registerModule({
      name: `mount:${prefix}`,
      meta: { host: ['*'], static: { [prefix]: 'disk' } },
      roots: { disk: rootDir },
    })
  }

  resolveRequestUrl(url: string, host = '*'): GripStaticResolveResult {
    const res = this.handle({ method: 'GET', url, host })
    if (!res || res.statusCode !== 200) return { kind: 'miss' }
    return { kind: 'memory', body: res.body }
  }

  handle(req: {
    method: string
    url: string
    host?: string
    secure?: boolean
  }): GripAppServerStaticResponse | null {
    if (req.method !== 'GET' && req.method !== 'HEAD') return null

    for (const mod of this.modules) {
      const hosts = mod.meta.host ?? ['*']
      if (!matchGripAppHost(req.host, hosts)) continue
      if (mod.meta.secure != null && mod.meta.secure !== (req.secure === true)) continue

      for (const mount of mod.mounts) {
        const stripped = stripGripStaticPrefix(req.url, mount.prefix)
        if (!stripped.matched) continue
        const root = mod.roots[mount.rootKey]
        if (!root) continue

        let body: string | null = null
        if (root.kind === 'memory') {
          body = memoryLookup(root.root, stripped.rewritten)
        } else {
          const filePath = resolveGripStaticFilePath(root.rootDir, stripped.rewritten)
          if (filePath && existsSync(filePath)) {
            body = readFileSync(filePath, 'utf8')
          }
        }
        if (body != null) {
          return {
            statusCode: 200,
            body: req.method === 'HEAD' ? '' : body,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              ...gripAppServerNoCacheHeaders(),
            },
          }
        }
      }
    }

    return {
      statusCode: 404,
      body: GRIP_APP_SERVER_404_BODY,
      headers: gripAppServerNoCacheHeaders(),
    }
  }
}

export type GripStaticResolveResult =
  | { kind: 'memory'; body: string }
  | { kind: 'file'; filePath: string; mount: GripAppStaticMount }
  | { kind: 'miss' }

/** grip `handleSync` path + method gate. */
export function matchGripAppSyncRoute(
  ctx: { pathname: string },
  method: string,
  expectedMethod: string,
  path: string,
): boolean {
  return method === expectedMethod && ctx.pathname === path
}
